import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, OnInit, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';
import { DescansoAdjuntos } from '../shared/descanso-adjuntos/descanso-adjuntos';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import { DescansosService } from './descansos.service';
import {
  DescansoMedicoDetalleDto,
  DescansoMedicoCreateDto,
  DescansoAdjuntoDto,
  DescansoAprobarDto,
  DescansoRechazarDto,
  DarAltaDto,
  DescansoSeguimientoDto,
  DescansoSeguimientoCreateDto,
  DescansoTipoDto,
} from './descansos.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

type TabKey = 'detalle' | 'seguimientos';

@Component({
  selector: 'app-descanso-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AbrilModalPanel, DatePicker, SearchSelect,
    WorkerSearchInput, DescansoAdjuntos,
  ],
  templateUrl: './descanso-modal.component.html',
  styleUrl: './descanso-modal.component.css',
})
export class DescansoModalComponent implements OnInit {
  /** null = modo creación, objeto = modo detalle/gestión */
  @Input() descansoId: number | null = null;
  /** Catálogo completo de tipos (los 4). Lo trae la página en su carga inicial. */
  @Input() tipos: DescansoTipoDto[] = [];
  /** Preselecciona el trabajador (p. ej. al crear desde el detalle de un accidente) y oculta el buscador. */
  @Input() presetWorker: WorkerSearchItemDto | null = null;
  /** Vincula el descanso creado a un accidente de trabajo existente. */
  @Input() presetAccidenteId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  // ── Estado general ────────────────────────────────────────────────────────
  tab: TabKey = 'detalle';
  loading   = true;
  saving    = false;
  isNuevo   = false;

  detalle: DescansoMedicoDetalleDto | null = null;
  seguimientos: DescansoSeguimientoDto[] = [];

  // ── Worker search (solo modo creación) ───────────────────────────────────
  workerSelected : WorkerSearchItemDto | null = null;

  // ── Formulario creación ───────────────────────────────────────────────────
  cTipoId      : number | null = null;
  cFechaInicio = '';
  cFechaFin    = '';
  cDiagnostico = '';
  cDocumentos  : File[] = [];

  // ── Aprobar / Rechazar ────────────────────────────────────────────────────
  aprobarObs  = '';
  rechazarMotivo = '';

  // ── Alta ─────────────────────────────────────────────────────────────────
  altaObs = '';

  // ── Nuevo seguimiento ─────────────────────────────────────────────────────
  segTipo         = 'Médico';
  segNota         = '';
  segProximaCita  = '';
  segGuardando    = false;

  readonly tiposSeguimiento = ['Médico', 'Asistenta Social', 'Seguimiento', 'Alta'];
  readonly tiposSeguimientoOpts = this.tiposSeguimiento.map(t => ({ id: t, label: t }));

  constructor(
    private svc          : DescansosService,
    private errorService : ErrorService,
    private loaderService: LoaderService,
    private cdr          : ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.descansoId) {
      this.isNuevo = false;
      this.loadDetalle();
    } else {
      this.isNuevo = true;
      this.loading = false;
      // Mismo arranque que Mi Salud: fechas prellenadas con hoy.
      const hoy = new Date().toISOString().slice(0, 10);
      this.cFechaInicio = hoy;
      this.cFechaFin    = hoy;
      if (this.presetWorker) {
        this.workerSelected = this.presetWorker;
      }
      // La pantalla de Descansos ya trae el catálogo en su carga inicial; si el modal se abre
      // desde otra (p. ej. el detalle de un accidente) se pide aquí para no dejar el combo vacío.
      if (this.tipos.length === 0) this.loadTipos();
    }
  }

  // ── Carga ────────────────────────────────────────────────────────────────
  private loadDetalle(): void {
    this.loading = true;
    this.svc.getById(this.descansoId!).subscribe({
      next: d => {
        this.detalle = d;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.close();
      },
    });
  }

  private loadTipos(): void {
    this.svc.getTipos().subscribe({
      next: t => { this.tipos = t; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  loadSeguimientos(): void {
    if (!this.descansoId) return;
    this.svc.getSeguimientos(this.descansoId).subscribe({
      next: s => { this.seguimientos = s; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  setTab(t: TabKey): void {
    this.tab = t;
    if (t === 'seguimientos' && this.seguimientos.length === 0) this.loadSeguimientos();
    this.cdr.detectChanges();
  }

  // ── Getters de estado ────────────────────────────────────────────────────
  get estado(): string { return this.detalle?.estado ?? ''; }
  get isPendiente(): boolean { return this.estado === 'Pendiente'; }
  get isAprobado(): boolean  { return this.estado === 'Aprobado'; }
  get isCompletado(): boolean { return this.estado === 'Completado'; }
  get canAlta(): boolean     { return this.isAprobado; }
  get canProrroga(): boolean { return this.isAprobado || this.isCompletado; }

  /** Certificados a mostrar en el detalle: los adjuntos nuevos o, si no hay, el archivo antiguo. */
  get certificados(): DescansoAdjuntoDto[] {
    if (this.detalle?.adjuntos?.length) return this.detalle.adjuntos;
    const legado = this.detalle?.urlCertificado ?? this.detalle?.urlDocumento;
    return legado ? [{ url: legado, nombre: 'Ver certificado médico' }] : [];
  }

  // ── Prórroga ──────────────────────────────────────────────────────────────
  prorrogaMode    = false;
  pFechaInicio    = '';
  pFechaFin       = '';

  iniciarProrroga(): void {
    // Pre-llenar con el día siguiente a la fecha fin del descanso actual
    const finActual = this.detalle?.fechaFin;
    if (finActual) {
      const d = new Date(finActual);
      d.setDate(d.getDate() + 1);
      this.pFechaInicio = d.toISOString().slice(0, 10);
      const d2 = new Date(d);
      d2.setDate(d2.getDate() + 6);
      this.pFechaFin = d2.toISOString().slice(0, 10);
    }
    this.prorrogaMode = true;
    this.cdr.detectChanges();
  }

  cancelarProrroga(): void { this.prorrogaMode = false; this.cdr.detectChanges(); }

  guardarProrroga(): void {
    if (!this.pFechaInicio || !this.pFechaFin) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa las fechas de la prórroga.' });
      return;
    }
    const dto: DescansoMedicoCreateDto = {
      workerId      : this.detalle!.workerId,
      // La prórroga hereda el tipo del descanso que prorroga.
      tipoId        : this.detalle!.tipoId,
      fechaInicio   : this.pFechaInicio,
      fechaFin      : this.pFechaFin,
      prorrogaDelId : this.descansoId!,
    };
    this.saving = true;
    this.loaderService.show();
    this.svc.create(dto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        this.prorrogaMode = false;
        Swal.fire({ icon: 'success', title: 'Prórroga creada', text: 'Se creó un nuevo descanso vinculado a este.', timer: 2000, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get title(): string {
    if (this.isNuevo) return 'Nuevo Descanso Médico';
    return `Descanso #${this.descansoId} · ${this.estado}`;
  }

  // ── Creación ─────────────────────────────────────────────────────────────
  onWorkerSelectedChange(w: WorkerSearchItemDto | null): void {
    this.workerSelected = w;
  }

  // La app corre zoneless: tras cambiar estado desde un evento hay que pedir el repintado.
  onFechaInicioChange(v: string | null): void {
    this.cFechaInicio = v ?? '';
    // Si la fecha fin quedó antes del nuevo inicio, se arrastra para no dejar un rango inválido.
    if (this.cFechaFin && this.cFechaInicio && this.cFechaFin < this.cFechaInicio) this.cFechaFin = this.cFechaInicio;
    this.cdr.detectChanges();
  }

  onFechaFinChange(v: string | null): void {
    this.cFechaFin = v ?? '';
    this.cdr.detectChanges();
  }

  onDocumentosChange(archivos: File[]): void {
    this.cDocumentos = archivos;
    this.cdr.detectChanges();
  }

  onProrrogaInicioChange(v: string | null): void {
    this.pFechaInicio = v ?? '';
    if (this.pFechaFin && this.pFechaInicio && this.pFechaFin < this.pFechaInicio) this.pFechaFin = this.pFechaInicio;
    this.cdr.detectChanges();
  }

  onProrrogaFinChange(v: string | null): void {
    this.pFechaFin = v ?? '';
    this.cdr.detectChanges();
  }

  onProximaCitaChange(v: string | null): void {
    this.segProximaCita = v ?? '';
    this.cdr.detectChanges();
  }

  /** Días de descanso del rango elegido (ambos extremos incluidos). */
  get diasCalculados(): number {
    if (!this.cFechaInicio || !this.cFechaFin) return 0;
    const dias = Math.round(
      (new Date(this.cFechaFin).getTime() - new Date(this.cFechaInicio).getTime()) / 86400000,
    ) + 1;
    return dias > 0 ? dias : 0;
  }

  get canCreate(): boolean {
    return !!(this.workerSelected && this.cTipoId && this.cFechaInicio && this.cFechaFin) && !this.saving;
  }

  crear(): void {
    if (!this.canCreate || !this.workerSelected) return;
    if (this.cFechaFin < this.cFechaInicio) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha de fin no puede ser anterior a la de inicio.' });
      return;
    }
    const dto: DescansoMedicoCreateDto = {
      workerId    : this.workerSelected.id,
      tipoId      : this.cTipoId!,
      fechaInicio : this.cFechaInicio,
      fechaFin    : this.cFechaFin,
      diagnostico : this.cDiagnostico      || undefined,
      accidenteId : this.presetAccidenteId ?? undefined,
    };
    this.saving = true;
    this.loaderService.show();
    this.svc.create(dto, this.cDocumentos).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Registrado', timer: 1400, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Aprobar ───────────────────────────────────────────────────────────────
  aprobar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar descanso?',
      text: 'El trabajador será bloqueado automáticamente en Control de Acceso.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
    }).then(r => {
      if (!r.isConfirmed) return;
      const dto: DescansoAprobarDto = { observaciones: this.aprobarObs || undefined };
      this.saving = true;
      this.loaderService.show();
      this.svc.aprobar(this.descansoId!, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Aprobado', text: 'Trabajador bloqueado en Control de Acceso.', timer: 2000, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Rechazar ─────────────────────────────────────────────────────────────
  rechazar(): void {
    if (!this.rechazarMotivo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingrese el motivo de rechazo.' });
      return;
    }
    const dto: DescansoRechazarDto = { motivoRechazo: this.rechazarMotivo };
    this.saving = true;
    this.loaderService.show();
    this.svc.rechazar(this.descansoId!, dto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'info', title: 'Rechazado', timer: 1400, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta ─────────────────────────────────────────────────────────────────
  darAlta(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Dar de alta al trabajador?',
      text: 'El descanso se marcará como Completado y el trabajador será desbloqueado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar alta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
    }).then(r => {
      if (!r.isConfirmed) return;
      const dto: DarAltaDto = { observaciones: this.altaObs || undefined };
      this.saving = true;
      this.loaderService.show();
      this.svc.darAlta(this.descansoId!, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Alta registrada', text: 'Trabajador desbloqueado.', timer: 2000, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Seguimiento ───────────────────────────────────────────────────────────
  guardarSeguimiento(): void {
    if (!this.segTipo.trim() || !this.segNota.trim()) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'El tipo y la nota son obligatorios.' });
      return;
    }
    const dto: DescansoSeguimientoCreateDto = {
      tipo        : this.segTipo,
      nota        : this.segNota        || undefined,
      proximaCita : this.segProximaCita || undefined,
    };
    this.segGuardando = true;
    this.svc.createSeguimiento(this.descansoId!, dto).subscribe({
      next: () => {
        this.segGuardando = false;
        this.segNota = '';
        this.segProximaCita = '';
        Swal.fire({ icon: 'success', title: 'Seguimiento registrado', timer: 1200, showConfirmButton: false });
        this.loadSeguimientos();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.segGuardando = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void { this.closed.emit(); }

  // ── Helpers de vista ──────────────────────────────────────────────────────
  estadoBadgeClass(estado: string): string {
    return {
      'Pendiente' : 'badge-amber',
      'Aprobado'  : 'badge-green',
      'Rechazado' : 'badge-red',
      'Completado': 'badge-blue',
    }[estado] ?? 'badge-gray';
  }
}
