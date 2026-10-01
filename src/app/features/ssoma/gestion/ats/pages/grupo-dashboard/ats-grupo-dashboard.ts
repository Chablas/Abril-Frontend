import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { AtsService } from '../../services/ats.service';
import { AtsGrupoEstadoDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PetarService } from '../../../petar/services/petar.service';
import { PetarTipoDto, PetarGrupoEstadoDto, RespuestaChecklist } from '../../../petar/dtos/petar.dtos';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';

/**
 * Panel del autor de un ATS grupal: el QR para que la cuadrilla se adhiera, y cuántos ya
 * firmaron en vivo. Se refresca solo cada 15s mientras el grupo sigue "Activo" — así el autor no
 * tiene que estar tocando "Actualizar" a cada rato durante la charla de 5 minutos.
 */
@Component({
  selector: 'app-ats-grupo-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilModalPanel, SignaturePad],
  templateUrl: './ats-grupo-dashboard.html',
  styleUrl: './ats-grupo-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsGrupoDashboard implements OnInit, OnDestroy {
  id!: number;
  grupo: AtsGrupoEstadoDto | null = null;
  qrDataUrl: string | null = null;
  loading = true;
  cerrando = false;

  // ── PETAR grupal ──────────────────────────────────────────────────────
  petares: PetarGrupoEstadoDto[] = [];
  mostrarFormPetar = false;
  guardandoPetar = false;
  tipos: PetarTipoDto[] = [];
  nuevoTipoId: number | null = null;
  nuevaDescripcion = '';
  nuevoLugar = '';
  nuevaHoraInicio = '';
  nuevaHoraFin = '';
  respuestasPorItem = new Map<number, RespuestaChecklist>();

  // Firma de Supervisor/SSOMA de un PETAR grupal puntual
  petarFirmando: PetarGrupoEstadoDto | null = null;
  rolFirmando: 'Supervisor' | 'Ssoma' | null = null;
  hayFirmaPetar = false;
  guardandoFirmaPetar = false;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  private refrescoInterval?: ReturnType<typeof setInterval>;

  constructor(
    private svc: AtsService,
    private petarSvc: PetarService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.cargarPetares();
    this.refrescoInterval = setInterval(() => {
      if (this.grupo?.estado === 'Activo') { this.cargar(false); this.cargarPetares(); }
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refrescoInterval) clearInterval(this.refrescoInterval);
  }

  cargar(mostrarLoading = true): void {
    if (mostrarLoading) this.loading = true;
    this.svc.getEstadoGrupo(this.id).subscribe({
      next: (res) => {
        this.grupo = res;
        this.loading = false;
        this.cdr.markForCheck();
        if (!this.qrDataUrl) this.generarQr(res.qrToken);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private generarQr(token: string): void {
    const url = `${window.location.origin}/ats-grupal/${token}`;
    QRCode.toDataURL(url, { width: 360, margin: 2 }).then((dataUrl) => {
      this.qrDataUrl = dataUrl;
      this.cdr.markForCheck();
    });
  }

  get linkAdhesion(): string {
    return this.grupo ? `${window.location.origin}/ats-grupal/${this.grupo.qrToken}` : '';
  }

  copiarLink(): void {
    if (!this.linkAdhesion) return;
    navigator.clipboard?.writeText(this.linkAdhesion).then(() => {
      Swal.fire({ icon: 'success', title: 'Link copiado', timer: 1200, showConfirmButton: false });
    });
  }

  copiarLinkCapataz(): void {
    if (!this.grupo) return;
    const link = `${window.location.origin}/ats-grupal/capataz/${this.grupo.qrToken}`;
    navigator.clipboard?.writeText(link).then(() => {
      Swal.fire({ icon: 'success', title: 'Link del Capataz copiado', timer: 1200, showConfirmButton: false });
    });
  }

  cerrarGrupo(): void {
    if (!this.grupo || this.cerrando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar este ATS grupal?',
      text: 'Nadie más podrá adherirse con este QR. Los que ya firmaron quedan igual, no se ven afectados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cerrando = true;
      this.svc.cerrarGrupo(this.id).subscribe({
        next: () => {
          this.cerrando = false;
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.cerrando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/ats']);
  }

  // ── PETAR grupal ──────────────────────────────────────────────────────

  cargarPetares(): void {
    this.petarSvc.getEstadosPorAtsGrupo(this.id).subscribe({
      next: (res) => { this.petares = res; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  abrirFormPetar(): void {
    this.mostrarFormPetar = true;
    this.nuevoTipoId = null;
    this.nuevaDescripcion = '';
    this.nuevoLugar = '';
    this.nuevaHoraInicio = '';
    this.nuevaHoraFin = '';
    this.respuestasPorItem.clear();
    this.cdr.markForCheck();
    if (this.tipos.length === 0) {
      this.petarSvc.getTiposCatalogo().subscribe({
        next: (res) => { this.tipos = res; this.cdr.markForCheck(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    }
  }

  cerrarFormPetar(): void {
    this.mostrarFormPetar = false;
    this.cdr.markForCheck();
  }

  get tipoSeleccionado(): PetarTipoDto | undefined {
    return this.tipos.find((t) => t.id === this.nuevoTipoId);
  }

  respuestaDe(itemId: number): RespuestaChecklist | undefined {
    return this.respuestasPorItem.get(itemId);
  }

  setRespuesta(itemId: number, valor: RespuestaChecklist): void {
    this.respuestasPorItem.set(itemId, valor);
    this.cdr.markForCheck();
  }

  get puedeGuardarPetar(): boolean {
    const tipo = this.tipoSeleccionado;
    if (!tipo || !this.nuevaDescripcion.trim() || this.guardandoPetar) return false;
    if (tipo.items.length === 0) return true;
    return tipo.items.every((i) => !!this.respuestaDe(i.id));
  }

  guardarPetarGrupo(): void {
    if (!this.puedeGuardarPetar || !this.nuevoTipoId) return;

    const respuestasNo = this.tipoSeleccionado!.items.filter((i) => this.respuestaDe(i.id) === 'NO');
    if (respuestasNo.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Hay ítems marcados como NO cumplidos',
        text: 'El trabajo no puede iniciar hasta corregirlos — no se puede generar el PETAR así.',
      });
      return;
    }

    this.guardandoPetar = true;
    this.cdr.markForCheck();

    this.petarSvc.crearGrupo({
      atsGrupoId: this.id,
      tipoId: this.nuevoTipoId,
      descripcionTrabajo: this.nuevaDescripcion.trim(),
      lugar: this.nuevoLugar.trim() || undefined,
      horaInicio: this.nuevaHoraInicio || undefined,
      horaFin: this.nuevaHoraFin || undefined,
      respuestas: this.tipoSeleccionado!.items.map((i) => ({ itemId: i.id, respuesta: this.respuestaDe(i.id)! })),
    }).subscribe({
      next: () => {
        this.guardandoPetar = false;
        this.mostrarFormPetar = false;
        this.cargarPetares();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPetar = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirFirmaPetar(p: PetarGrupoEstadoDto, rol: 'Supervisor' | 'Ssoma'): void {
    this.petarFirmando = p;
    this.rolFirmando = rol;
    this.hayFirmaPetar = false;
    this.cdr.markForCheck();
  }

  cerrarFirmaPetar(): void {
    this.petarFirmando = null;
    this.rolFirmando = null;
    this.cdr.markForCheck();
  }

  onFirmaPetarChange(tieneTrazo: boolean): void {
    this.hayFirmaPetar = tieneTrazo;
  }

  guardarFirmaPetar(): void {
    const p = this.petarFirmando;
    if (!p || !this.rolFirmando || this.guardandoFirmaPetar) return;
    const firma = this.firmaPad?.toDataUrl();
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.guardandoFirmaPetar = true;
    this.cdr.markForCheck();

    const req$ = this.rolFirmando === 'Supervisor'
      ? this.petarSvc.firmarSupervisorGrupo(p.id, { firmaBase64: firma })
      : this.petarSvc.firmarSsomaGrupo(p.id, { firmaBase64: firma });

    req$.subscribe({
      next: () => {
        this.guardandoFirmaPetar = false;
        this.cerrarFirmaPetar();
        this.cargarPetares();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirmaPetar = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
