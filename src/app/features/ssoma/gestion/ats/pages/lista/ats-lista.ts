import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { AtsService } from '../../services/ats.service';
import { AtsResponseDto, AtsFiltroDto, AtsProyectoDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';

type RolVisto = 'autoriza' | 'ssoma';

@Component({
  selector: 'app-ats-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    SignaturePad,
    FabButton,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    Paginator,
  ],
  templateUrl: './ats-lista.html',
  styleUrl: './ats-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsLista implements OnInit {
  lista: AtsResponseDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 0;
  page = 1;

  proyectos: AtsProyectoDto[] = [];
  filtroProyectoId: number | null = null;
  filtroEstado: string | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtrosAbiertos = false;
  soloPendientes = false;

  readonly estadoOpts = [
    { id: 'Borrador', label: 'Borrador' },
    { id: 'Firmado', label: 'Firmado' },
  ];

  // ── Firma de Autoriza / Visto Bueno SSOMA ──────────────────────────────
  atsFirmandoVisto: AtsResponseDto | null = null;
  rolVisto: RolVisto | null = null;
  hayFirmaVisto = false;
  guardandoVisto = false;

  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  readonly headerTabs: AbrilPageTab[] = [
    { label: 'Listado ATS', icono: 'ti-list', route: '/ssoma/gestion/ats', exact: true },
    { label: 'Plantillas', icono: 'ti-clipboard-list', route: '/ssoma/gestion/ats/plantillas', exact: true },
    { label: 'Pasos por puesto', icono: 'ti-users', route: '/ssoma/gestion/ats/plantillas/pasos', exact: true },
    { label: 'Autorizaciones', icono: 'ti-file-signature', route: '/ssoma/gestion/ats/plantillas/autorizaciones', exact: true },
    { label: 'Riesgos', icono: 'ti-alert-triangle', route: '/ssoma/gestion/ats/plantillas/riesgos', exact: true },
  ];

  constructor(
    private svc: AtsService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.svc.getInit().subscribe({
      next: (init) => {
        this.proyectos = [...init.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.cargar();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  cargar(): void {
    this.loading = true;
    const filtro: AtsFiltroDto = {
      proyectoId: this.filtroProyectoId ?? undefined,
      estado: this.filtroEstado ?? undefined,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
      page: this.page,
    };
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

  filtrar(): void {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.filtroEstado = null;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.page = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.page = p;
    this.cargar();
  }

  nuevoAts(): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo']);
  }

  generarPetar(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/petar/nuevo'], { queryParams: { atsId: a.id } });
  }

  /** Un ATS firmado es inmutable — la única forma de corregirlo (condición real en campo
   *  distinta a la evaluada) es un ATS nuevo enlazado, y solo tiene sentido el mismo día. */
  esCorregibleHoy(a: AtsResponseDto): boolean {
    return a.estado === 'Firmado' && a.fecha === new Date().toISOString().slice(0, 10);
  }

  corregirAts(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { corregir: a.id } });
  }

  /** Misma tarea y riesgos, otro lugar (ej. Torre B en vez de Torre A) — reusa el mismo
   *  prellenado que "Corregir", solo cambia el aviso que ve el trabajador. */
  duplicarAts(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { duplicar: a.id } });
  }

  descargarPdf(ats: AtsResponseDto): void {
    this.svc.getPdfBlob(ats.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS-${ats.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  estadoClass(estado: string): string {
    return estado === 'Firmado' ? 'badge-firmado' : 'badge-borrador';
  }

  /** Lo que Samuel pidió: ver de un vistazo qué ATS ya firmados todavía no tienen las dos
   *  firmas adicionales (Autoriza / Visto Bueno SSOMA), sin importar el proyecto. */
  get listaFiltrada(): AtsResponseDto[] {
    if (!this.soloPendientes) return this.lista;
    return this.lista.filter((a) => a.estado === 'Firmado' && (!a.autorizaFirmaUrl || !a.ssomaFirmaUrl));
  }

  toggleSoloPendientes(): void {
    this.soloPendientes = !this.soloPendientes;
    this.cdr.markForCheck();
  }

  // ── Firma de Autoriza / Visto Bueno SSOMA ──────────────────────────────

  abrirFirmaVisto(ats: AtsResponseDto, rol: RolVisto): void {
    this.atsFirmandoVisto = ats;
    this.rolVisto = rol;
    this.hayFirmaVisto = false;
    this.cdr.markForCheck();
  }

  cerrarFirmaVisto(): void {
    this.atsFirmandoVisto = null;
    this.rolVisto = null;
    this.cdr.markForCheck();
  }

  onFirmaVistoChange(tieneTrazo: boolean): void {
    this.hayFirmaVisto = tieneTrazo;
  }

  get vistoTitulo(): string {
    return this.rolVisto === 'autoriza' ? 'Firmar como Autoriza (Residente / Ing. Producción)' : 'Visto Bueno SSOMA';
  }

  guardarFirmaVisto(): void {
    const ats = this.atsFirmandoVisto;
    if (!ats || !this.rolVisto || !this.firmaPad || this.guardandoVisto) return;

    const firma = this.firmaPad.toDataUrl();
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.guardandoVisto = true;
    this.cdr.markForCheck();

    const req$ = this.rolVisto === 'autoriza'
      ? this.svc.firmarAutorizacion(ats.id, { firmaBase64: firma })
      : this.svc.firmarVistoSsoma(ats.id, { firmaBase64: firma });

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
}
