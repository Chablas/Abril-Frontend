import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, OnDestroy, OnInit, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { WorkerSearchService } from '../services/worker-search.service';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import { DescansosService } from './descansos.service';
import {
  DescansoMedicoDetalleDto,
  DescansoMedicoCreateDto,
  DescansoAprobarDto,
  DescansoRechazarDto,
  DarAltaDto,
  DescansoSeguimientoDto,
  DescansoSeguimientoCreateDto,
} from './descansos.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

type TabKey = 'detalle' | 'seguimientos';

@Component({
  selector: 'app-descanso-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './descanso-modal.component.html',
  styleUrl: './descanso-modal.component.css',
})
export class DescansoModalComponent implements OnInit, OnDestroy {
  /** null = modo creación, objeto = modo detalle/gestión */
  @Input() descansoId: number | null = null;
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
  workerQuery    = '';
  workerResults  : WorkerSearchItemDto[] = [];
  workerSelected : WorkerSearchItemDto | null = null;
  workerSearching = false;
  private workerQ$ = new Subject<string>();

  // ── Formulario creación ───────────────────────────────────────────────────
  cTipo        = 'Particular';
  cFechaInicio = '';
  cFechaFin    = '';
  cMotivo      = '';
  cDiagnostico = '';
  cMedicoCertifica = '';
  cEstablecimiento = '';
  cObservaciones = '';
  cReportadoPorTrabajador = false;
  cArchivoCertificado: File | null = null;

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

  readonly tiposDescanso = ['Particular', 'Ocupacional'];
  readonly tiposSeguimiento = ['Médico', 'Asistenta Social', 'Seguimiento', 'Alta'];

  private destroy$ = new Subject<void>();

  constructor(
    private svc          : DescansosService,
    private workerSearch : WorkerSearchService,
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
      if (this.presetWorker) {
        this.workerSelected = this.presetWorker;
        this.workerQuery = this.presetWorker.apellidoNombre;
      }
    }

    // Debounce worker search
    this.workerQ$.pipe(takeUntil(this.destroy$)).subscribe(q => this.runWorkerSearch(q));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

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

  // ── Prórroga ──────────────────────────────────────────────────────────────
  prorrogaMode    = false;
  pFechaInicio    = '';
  pFechaFin       = '';
  pMotivo         = '';

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
      workerId              : this.detalle!.workerId,
      tipo                  : this.detalle!.tipo,
      fechaInicio           : this.pFechaInicio,
      fechaFin              : this.pFechaFin,
      motivo                : this.pMotivo || undefined,
      reportadoPorTrabajador: false,
      prorrogaDelId         : this.descansoId!,
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
  onWorkerQueryChange(value: string): void {
    this.workerQuery = value;
    if (this.workerSelected) this.workerSelected = null;
    if (!value || value.trim().length < 2) { this.workerResults = []; return; }
    this.workerSearching = true;
    // simple debounce
    setTimeout(() => this.workerQ$.next(value.trim()), 300);
  }

  private runWorkerSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: res => { this.workerResults = res; this.workerSearching = false; this.cdr.detectChanges(); },
      error: ()  => { this.workerResults = []; this.workerSearching = false; this.cdr.detectChanges(); },
    });
  }

  selectWorker(w: WorkerSearchItemDto): void {
    this.workerSelected = w;
    this.workerQuery    = w.apellidoNombre;
    this.workerResults  = [];
  }

  clearWorker(): void { this.workerSelected = null; this.workerQuery = ''; this.workerResults = []; }

  onCertificado(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.cArchivoCertificado = f ?? null;
  }

  get canCreate(): boolean {
    return !!(this.workerSelected && this.cTipo && this.cFechaInicio && this.cFechaFin) && !this.saving;
  }

  crear(): void {
    if (!this.canCreate || !this.workerSelected) return;
    if (this.cFechaFin < this.cFechaInicio) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha de fin no puede ser anterior a la de inicio.' });
      return;
    }
    const dto: DescansoMedicoCreateDto = {
      workerId              : this.workerSelected.id,
      tipo                  : this.cTipo,
      fechaInicio           : this.cFechaInicio,
      fechaFin              : this.cFechaFin,
      motivo                : this.cMotivo            || undefined,
      diagnostico           : this.cDiagnostico       || undefined,
      medicoCertifica       : this.cMedicoCertifica   || undefined,
      establecimiento       : this.cEstablecimiento   || undefined,
      observaciones         : this.cObservaciones     || undefined,
      reportadoPorTrabajador: this.cReportadoPorTrabajador,
      accidenteId           : this.presetAccidenteId  ?? undefined,
    };
    this.saving = true;
    this.loaderService.show();
    this.svc.create(dto, this.cArchivoCertificado ?? undefined).subscribe({
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
