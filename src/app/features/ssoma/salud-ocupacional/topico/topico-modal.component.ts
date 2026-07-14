import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, OnDestroy, OnInit, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { TopicoService } from './topico.service';
import {
  TopicoAtencionDto, TopicoTipoAtencionDto, CrearTopicoAtencionDto,
  TopicoEvolucionDto, TopicoEvolucionCreateDto,
} from './topico.dtos';
import { WorkerSearchService } from '../services/worker-search.service';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-topico-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './topico-modal.component.html',
  styleUrl: './topico-modal.component.css',
})
export class TopicoModalComponent implements OnInit, OnDestroy {
  @Input() atencion: TopicoAtencionDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  saving = false;

  // ── Tabs (solo en modo edición) ──────────────────────────────────────────
  tab: 'form' | 'evoluciones' = 'form';

  // ── Evoluciones clínicas ─────────────────────────────────────────────────
  evoluciones        : TopicoEvolucionDto[] = [];
  evLoading          = false;
  evNota             = '';
  evArchivo          : File | null = null;
  evGuardando        = false;

  // Worker search
  workerQuery    = '';
  workerResults  : WorkerSearchItemDto[] = [];
  workerSelected : WorkerSearchItemDto | null = null;
  workerSearching = false;

  // Tipos de atención cargados desde API
  tiposAtencion: TopicoTipoAtencionDto[] = [];

  // Campos del formulario
  fecha               = new Date().toISOString().slice(0, 10);
  hora                = '';
  tipoAtencionId      = 0;
  motivo              = '';
  diagnostico         = '';
  diagnosticoCie10    = '';
  tratamiento         = '';
  medicamentos        = '';
  presionArterial     = '';
  temperatura         : number | null = null;
  frecuenciaCardiaca  : number | null = null;
  saturacionOxigeno   : number | null = null;
  peso                : number | null = null;
  derivadoClinica     = false;
  clinicaDerivacion   = '';
  generaDescanso      = false;
  descansoDias        : number | null = null;
  generaAccidente     = false;
  sctrActivado        = false;
  tipoCasoSctr        = '';
  proyectoId          : number | null = null;
  observaciones       = '';
  archivoInforme      : File | null = null;

  private workerQ$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  get isEdicion(): boolean { return !!this.atencion?.id; }

  constructor(
    private svc          : TopicoService,
    private workerSearch : WorkerSearchService,
    private errorService : ErrorService,
    private loaderService: LoaderService,
    private cdr          : ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.workerQ$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.runWorkerSearch(q));

    // Cargar tipos de atención desde API
    this.svc.getTiposAtencion().subscribe({
      next: tipos => {
        this.tiposAtencion = tipos;
        this.cdr.detectChanges();
      },
      error: () => { /* no bloquear el formulario si falla */ },
    });

    if (this.atencion) this.patchForm(this.atencion);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private patchForm(a: TopicoAtencionDto): void {
    this.fecha              = a.fecha;
    this.hora               = a.hora ? a.hora.substring(0, 5) : '';
    this.tipoAtencionId     = a.tipoAtencionId;
    this.motivo             = a.motivo           ?? '';
    this.diagnostico        = a.diagnostico      ?? '';
    this.diagnosticoCie10   = a.diagnosticoCie10  ?? '';
    this.tratamiento        = a.tratamiento      ?? '';
    this.medicamentos       = a.medicamentos     ?? '';
    this.presionArterial    = a.presionArterial  ?? '';
    this.temperatura        = a.temperatura        ?? null;
    this.frecuenciaCardiaca = a.frecuenciaCardiaca ?? null;
    this.saturacionOxigeno  = a.saturacionOxigeno  ?? null;
    this.peso               = a.peso               ?? null;
    this.derivadoClinica    = a.derivadoClinica;
    this.clinicaDerivacion  = a.clinicaDerivacion  ?? '';
    this.generaDescanso     = a.generaDescanso;
    this.descansoDias       = a.descansoDias       ?? null;
    this.generaAccidente    = a.generaAccidente;
    this.sctrActivado       = a.sctrActivado;
    this.tipoCasoSctr       = a.tipoCasoSctr       ?? '';
    this.proyectoId         = a.proyectoId         ?? null;
    this.observaciones      = a.observaciones      ?? '';

    if (a.workerId) {
      this.workerSelected = {
        id: a.workerId,
        apellidoNombre: a.workerNombre ?? `Worker #${a.workerId}`,
        dni: a.workerDni ?? '',
        ocupacion: '',
        activo: true,
        empresaActualId: undefined,
        empresaActual: undefined,
      } as WorkerSearchItemDto;
      this.workerQuery = this.workerSelected.apellidoNombre;
    }
  }

  // ── Worker search ─────────────────────────────────────────────────────────
  onWorkerQueryChange(value: string): void {
    this.workerQuery = value;
    if (this.workerSelected) this.workerSelected = null;
    if (!value || value.trim().length < 2) { this.workerResults = []; return; }
    this.workerSearching = true;
    this.workerQ$.next(value.trim());
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

  clearWorker(): void {
    this.workerSelected = null;
    this.workerQuery    = '';
    this.workerResults  = [];
  }

  onFile(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.archivoInforme = f ?? null;
  }

  get canSubmit(): boolean {
    return !!(this.workerSelected && this.fecha && this.tipoAtencionId) && !this.saving;
  }

  guardar(): void {
    if (!this.canSubmit || !this.workerSelected) return;

    if (this.generaDescanso && (!this.descansoDias || this.descansoDias < 1)) {
      Swal.fire({ icon: 'warning', title: 'Días requeridos', text: 'Ingrese la cantidad de días de descanso.' });
      return;
    }

    const dto: CrearTopicoAtencionDto = {
      workerId          : this.workerSelected.id,
      fecha             : this.fecha,
      hora              : this.hora              || undefined,
      tipoAtencionId    : this.tipoAtencionId,
      motivo            : this.motivo            || undefined,
      diagnostico       : this.diagnostico       || undefined,
      diagnosticoCie10  : this.diagnosticoCie10  || undefined,
      tratamiento       : this.tratamiento       || undefined,
      medicamentos      : this.medicamentos      || undefined,
      presionArterial   : this.presionArterial   || undefined,
      temperatura       : this.temperatura       ?? undefined,
      frecuenciaCardiaca: this.frecuenciaCardiaca ?? undefined,
      saturacionOxigeno : this.saturacionOxigeno  ?? undefined,
      peso              : this.peso              ?? undefined,
      derivadoClinica   : this.derivadoClinica,
      clinicaDerivacion : this.clinicaDerivacion || undefined,
      generaDescanso    : this.generaDescanso,
      descansoDias      : this.descansoDias      ?? undefined,
      generaAccidente   : this.generaAccidente,
      sctrActivado      : this.sctrActivado,
      tipoCasoSctr      : this.tipoCasoSctr      || undefined,
      proyectoId        : this.proyectoId        ?? undefined,
      observaciones     : this.observaciones     || undefined,
    };

    this.saving = true;
    this.loaderService.show();

    const obs = this.isEdicion
      ? this.svc.update(this.atencion!.id, dto, this.archivoInforme)
      : this.svc.create(dto, this.archivoInforme);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: this.isEdicion ? 'Actualizado' : 'Registrado', timer: 1400, showConfirmButton: false });
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

  close(): void { this.closed.emit(); }

  // ── Tabs ─────────────────────────────────────────────────────────────────
  setTab(t: 'form' | 'evoluciones'): void {
    this.tab = t;
    if (t === 'evoluciones' && this.evoluciones.length === 0) this.loadEvoluciones();
    this.cdr.detectChanges();
  }

  // ── Evoluciones ───────────────────────────────────────────────────────────
  loadEvoluciones(): void {
    if (!this.atencion?.id) return;
    this.evLoading = true;
    this.svc.getEvoluciones(this.atencion.id).subscribe({
      next: ev => { this.evoluciones = ev; this.evLoading = false; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => {
        this.evLoading = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onEvArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.evArchivo = f ?? null;
    this.cdr.detectChanges();
  }

  guardarEvolucion(): void {
    if (!this.evNota.trim()) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingrese la nota de evolución.' });
      return;
    }
    const dto: TopicoEvolucionCreateDto = { notaEvolucion: this.evNota.trim() };
    this.evGuardando = true;
    this.svc.createEvolucion(this.atencion!.id, dto, this.evArchivo).subscribe({
      next: () => {
        this.evGuardando = false;
        this.evNota    = '';
        this.evArchivo = null;
        Swal.fire({ icon: 'success', title: 'Evolución registrada', timer: 1200, showConfirmButton: false });
        this.loadEvoluciones();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.evGuardando = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  eliminarEvolucion(ev: TopicoEvolucionDto): void {
    Swal.fire({
      icon: 'question', title: '¿Eliminar evolución?',
      showCancelButton: true, confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.deleteEvolucion(ev.id).subscribe({
        next: () => { this.loadEvoluciones(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
