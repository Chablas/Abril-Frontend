import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { PetarService } from '../../services/petar.service';
import { PetarResponseDto, PetarFiltroDto } from '../../dtos/petar.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';

type RolVisto = 'supervisor' | 'ssoma';

@Component({
  selector: 'app-petar-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent, AbrilModalPanel, SignaturePad, Paginator],
  templateUrl: './petar-lista.html',
  styleUrl: './petar-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetarLista implements OnInit {
  lista: PetarResponseDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 0;
  page = 1;
  soloPendientes = false;

  petarFirmandoVisto: PetarResponseDto | null = null;
  rolVisto: RolVisto | null = null;
  hayFirmaVisto = false;
  guardandoVisto = false;

  petarCerrando: PetarResponseDto | null = null;
  observacionesCierre = '';
  hayFirmaCierre = false;
  cerrando = false;

  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  constructor(
    private svc: PetarService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    const filtro: PetarFiltroDto = { page: this.page };
    this.svc.listar(filtro).subscribe({
      next: (res) => {
        this.lista = res.data;
        this.totalRecords = res.totalRecords;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get listaFiltrada(): PetarResponseDto[] {
    if (!this.soloPendientes) return this.lista;
    return this.lista.filter((p) => p.estado === 'Borrador' && p.firmaUrl != null && (!p.supervisorFirmaUrl || !p.ssomaFirmaUrl));
  }

  toggleSoloPendientes(): void {
    this.soloPendientes = !this.soloPendientes;
    this.cdr.markForCheck();
  }

  cambiarPagina(p: number): void {
    this.page = p;
    this.cargar();
  }

  estadoClass(estado: string): string {
    if (estado === 'Cerrado') return 'badge-cerrado';
    if (estado === 'Firmado') return 'badge-firmado';
    return 'badge-borrador';
  }

  descargarPdf(p: PetarResponseDto): void {
    this.svc.getPdfBlob(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PETAR-${p.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Firma Supervisor / Visto Bueno SSOMA ────────────────────────────

  abrirFirmaVisto(p: PetarResponseDto, rol: RolVisto): void {
    this.petarFirmandoVisto = p;
    this.rolVisto = rol;
    this.hayFirmaVisto = false;
    this.cdr.markForCheck();
  }

  cerrarFirmaVisto(): void {
    this.petarFirmandoVisto = null;
    this.rolVisto = null;
    this.cdr.markForCheck();
  }

  onFirmaVistoChange(tieneTrazo: boolean): void {
    this.hayFirmaVisto = tieneTrazo;
  }

  get vistoTitulo(): string {
    return this.rolVisto === 'supervisor' ? 'Firmar como Supervisor / Responsable' : 'Visto Bueno SSOMA';
  }

  guardarFirmaVisto(): void {
    const p = this.petarFirmandoVisto;
    if (!p || !this.rolVisto || !this.firmaPad || this.guardandoVisto) return;

    const firma = this.firmaPad.toDataUrl();
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.guardandoVisto = true;
    this.cdr.markForCheck();

    const req$ = this.rolVisto === 'supervisor'
      ? this.svc.firmarSupervisor(p.id, { firmaBase64: firma })
      : this.svc.firmarVistoSsoma(p.id, { firmaBase64: firma });

    req$.subscribe({
      next: () => {
        this.guardandoVisto = false;
        this.cerrarFirmaVisto();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoVisto = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Cierre del trabajo ───────────────────────────────────────────────

  abrirCierre(p: PetarResponseDto): void {
    this.petarCerrando = p;
    this.observacionesCierre = '';
    this.hayFirmaCierre = false;
    this.cdr.markForCheck();
  }

  cerrarModalCierre(): void {
    this.petarCerrando = null;
    this.cdr.markForCheck();
  }

  onFirmaCierreChange(tieneTrazo: boolean): void {
    this.hayFirmaCierre = tieneTrazo;
  }

  confirmarCierre(): void {
    const p = this.petarCerrando;
    if (!p || !this.firmaPad || this.cerrando) return;

    const firma = this.firmaPad.toDataUrl();
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de cerrar el PETAR.' });
      return;
    }

    this.cerrando = true;
    this.cdr.markForCheck();
    this.svc.cerrar(p.id, { firmaBase64: firma, observaciones: this.observacionesCierre.trim() || undefined }).subscribe({
      next: () => {
        this.cerrando = false;
        this.cerrarModalCierre();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.cerrando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
