import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { CasoSocialService } from '../services/caso-social.service';
import { WorkerSearchService } from '../services/worker-search.service';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';
import {
  CasoSocialDetalleDto,
  CasoSocialCreateDto,
  CasoSocialUpdateDto,
  CasoSocialCerrarDto,
  SeguimientoCreateDto,
  SeguimientoDto,
  SctrGestionDto,
  SctrGestionCreateDto,
  SctrGestionUpdateDto,
} from '../dtos/caso-social.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

type TabKey = 'info' | 'seguimientos' | 'sctr';

const SCTR_ESTADOS = [
  { id: 1, nombre: 'Pendiente' },
  { id: 2, nombre: 'En trámite' },
  { id: 3, nombre: 'Aprobado' },
  { id: 4, nombre: 'Rechazado' },
];

@Component({
  selector: 'app-caso-social-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './caso-social-modal.component.html',
  styleUrl: './caso-social-modal.component.css',
})
export class CasoSocialModalComponent implements OnChanges, OnDestroy {
  /** null = crear, string UUID = editar/ver */
  @Input() casoId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  readonly sctrEstados = SCTR_ESTADOS;

  readonly tiposOpts = ['Familiar', 'Económico', 'Salud Mental', 'Legal', 'Laboral', 'Otro'];
  readonly prioridadesOpts = ['Alta', 'Media', 'Baja'];
  readonly seguimientoTipos = ['Visita', 'Llamada', 'Entrevista', 'Derivación', 'Cierre', 'Otro'];

  tab: TabKey = 'info';
  loading = false;
  saving  = false;
  isNuevo = false;

  detalle: CasoSocialDetalleDto | null = null;
  sctr: SctrGestionDto | null = null;
  loadingSctr = false;

  // ── Worker search (solo creación) ──────────────────────────────────────────
  workerQuery    = '';
  workerResults  : WorkerSearchItemDto[] = [];
  workerSelected : WorkerSearchItemDto | null = null;
  workerSearching = false;
  private workerQ$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // ── Formulario crear/editar ─────────────────────────────────────────────────
  fTipo         = 'Familiar';
  fPrioridad    = 'Media';
  fFechaApertura = '';
  fMotivo       = '';
  fDescripcion  = '';

  // ── Formulario seguimiento ──────────────────────────────────────────────────
  sgFecha       = '';
  sgTipo        = 'Llamada';
  sgDescripcion = '';
  sgProxima     = '';
  addingSeg     = false;
  savingSeg     = false;

  // ── Formulario cerrar ───────────────────────────────────────────────────────
  cerrando      = false;
  cFechaCierre  = '';
  cResultado    = '';

  // ── Formulario SCTR ────────────────────────────────────────────────────────
  sctrNumeroSiniestro = '';
  sctrFechaReporte    = '';
  sctrFechaAtencion   = '';
  sctrAseguradora     = '';
  sctrMonto           = '';
  sctrEstadoId        = 1;
  sctrObservaciones   = '';
  editandoSctr        = false;
  savingSctr          = false;

  constructor(
    private svc: CasoSocialService,
    private workerSvc: WorkerSearchService,
    private errorSvc: ErrorService,
    private loaderSvc: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['casoId']) {
      this.isNuevo = this.casoId === null;
      this.tab = 'info';
      if (this.isNuevo) {
        this.resetCreate();
        this.setupWorkerSearch();
      } else if (this.casoId) {
        this.cargar();
      }
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private resetCreate(): void {
    this.fTipo = 'Familiar'; this.fPrioridad = 'Media';
    this.fFechaApertura = ''; this.fMotivo = ''; this.fDescripcion = '';
    this.workerQuery = ''; this.workerResults = []; this.workerSelected = null;
  }

  private setupWorkerSearch(): void {
    this.workerQ$.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe((q) => {
      if (q.length < 2) { this.workerResults = []; this.cdr.detectChanges(); return; }
      this.workerSearching = true;
      this.workerSvc.search(q).subscribe({
        next: (r) => { this.workerResults = r; this.workerSearching = false; this.cdr.detectChanges(); },
        error: () => { this.workerSearching = false; this.cdr.detectChanges(); },
      });
    });
  }

  cargar(): void {
    this.loading = true;
    this.loaderSvc.show();
    this.svc.getById(this.casoId!).subscribe({
      next: (d) => {
        this.detalle = d;
        this.fTipo = d.tipoCaso; this.fPrioridad = d.prioridad;
        this.fFechaApertura = d.fechaApertura.slice(0, 10);
        this.fMotivo = d.motivo ?? ''; this.fDescripcion = d.descripcion ?? '';
        this.loading = false;
        this.loaderSvc.hide();
        this.cdr.detectChanges();
        this.cargarSctr();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false; this.loaderSvc.hide();
        this.errorSvc.handleError(err); this.cdr.detectChanges();
      },
    });
  }

  cargarSctr(): void {
    if (!this.casoId) return;
    this.loadingSctr = true;
    this.svc.getSctr(this.casoId).subscribe({
      next: (s) => {
        this.sctr = s;
        if (s) {
          this.sctrNumeroSiniestro = s.numeroSiniestro ?? '';
          this.sctrFechaReporte    = s.fechaReporteSctr?.slice(0, 10) ?? '';
          this.sctrFechaAtencion   = s.fechaAtencionSctr?.slice(0, 10) ?? '';
          this.sctrAseguradora     = s.aseguradora ?? '';
          this.sctrMonto           = s.montoCubierto != null ? String(s.montoCubierto) : '';
          this.sctrEstadoId        = s.estadoId;
          this.sctrObservaciones   = s.observaciones ?? '';
        }
        this.loadingSctr = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingSctr = false; this.cdr.detectChanges(); },
    });
  }

  onWorkerQuery(q: string): void { this.workerQ$.next(q); }

  selectWorker(w: WorkerSearchItemDto): void {
    this.workerSelected = w;
    this.workerQuery = w.apellidoNombre;
    this.workerResults = [];
    this.cdr.detectChanges();
  }

  guardar(): void {
    if (this.isNuevo) {
      if (!this.workerSelected) { Swal.fire({ icon: 'warning', title: 'Selecciona un trabajador', timer: 1500, showConfirmButton: false }); return; }
      if (!this.fFechaApertura) { Swal.fire({ icon: 'warning', title: 'Ingresa la fecha de apertura', timer: 1500, showConfirmButton: false }); return; }
      const dto: CasoSocialCreateDto = {
        workerId: this.workerSelected.id,
        tipoCaso: this.fTipo,
        prioridad: this.fPrioridad,
        fechaApertura: this.fFechaApertura,
        motivo: this.fMotivo || null,
        descripcion: this.fDescripcion || null,
      };
      this.saving = true;
      this.svc.create(dto).subscribe({
        next: () => { this.saving = false; this.saved.emit(); },
        error: (err: HttpErrorResponse) => { this.saving = false; this.errorSvc.handleError(err); this.cdr.detectChanges(); },
      });
    } else {
      const dto: CasoSocialUpdateDto = {
        tipoCaso: this.fTipo, prioridad: this.fPrioridad,
        fechaApertura: this.fFechaApertura,
        motivo: this.fMotivo || null, descripcion: this.fDescripcion || null,
      };
      this.saving = true;
      this.svc.update(this.casoId!, dto).subscribe({
        next: () => { this.saving = false; this.cargar(); this.saved.emit(); },
        error: (err: HttpErrorResponse) => { this.saving = false; this.errorSvc.handleError(err); this.cdr.detectChanges(); },
      });
    }
  }

  confirmarCerrar(): void {
    this.cerrando = true; this.cFechaCierre = ''; this.cResultado = '';
    this.cdr.detectChanges();
  }

  ejecutarCerrar(): void {
    if (!this.cFechaCierre) { Swal.fire({ icon: 'warning', title: 'Ingresa la fecha de cierre', timer: 1500, showConfirmButton: false }); return; }
    const dto: CasoSocialCerrarDto = { fechaCierre: this.cFechaCierre, resultado: this.cResultado || null };
    this.saving = true;
    this.svc.cerrar(this.casoId!, dto).subscribe({
      next: () => { this.saving = false; this.cerrando = false; this.cargar(); this.saved.emit(); },
      error: (err: HttpErrorResponse) => { this.saving = false; this.errorSvc.handleError(err); this.cdr.detectChanges(); },
    });
  }

  agregarSeguimiento(): void {
    if (!this.sgFecha || !this.sgTipo) return;
    const dto: SeguimientoCreateDto = {
      fecha: this.sgFecha, tipo: this.sgTipo,
      descripcion: this.sgDescripcion || null,
      proximaAccion: this.sgProxima || null,
    };
    this.savingSeg = true;
    this.svc.createSeguimiento(this.casoId!, dto).subscribe({
      next: () => {
        this.savingSeg = false; this.addingSeg = false;
        this.sgFecha = ''; this.sgTipo = 'Llamada'; this.sgDescripcion = ''; this.sgProxima = '';
        this.cargar();
      },
      error: (err: HttpErrorResponse) => { this.savingSeg = false; this.errorSvc.handleError(err); this.cdr.detectChanges(); },
    });
  }

  eliminarSeguimiento(seg: SeguimientoDto): void {
    Swal.fire({ icon: 'question', title: '¿Eliminar seguimiento?', showCancelButton: true,
      confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' })
      .then((r) => {
        if (!r.isConfirmed) return;
        this.svc.deleteSeguimiento(seg.id).subscribe({
          next: () => this.cargar(),
          error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
        });
      });
  }

  guardarSctr(): void {
    if (this.sctrEstadoId < 1) return;
    const dto: SctrGestionCreateDto | SctrGestionUpdateDto = {
      numeroSiniestro: this.sctrNumeroSiniestro || null,
      fechaReporteSctr: this.sctrFechaReporte || null,
      fechaAtencionSctr: this.sctrFechaAtencion || null,
      aseguradora: this.sctrAseguradora || null,
      montoCubierto: this.sctrMonto ? parseFloat(this.sctrMonto) : null,
      estadoId: this.sctrEstadoId,
      observaciones: this.sctrObservaciones || null,
    };
    this.savingSctr = true;
    const req$ = this.sctr
      ? this.svc.updateSctr(this.casoId!, dto as SctrGestionUpdateDto)
      : this.svc.createSctr(this.casoId!, dto as SctrGestionCreateDto);

    req$.subscribe({
      next: () => { this.savingSctr = false; this.editandoSctr = false; this.cargarSctr(); },
      error: (err: HttpErrorResponse) => { this.savingSctr = false; this.errorSvc.handleError(err); this.cdr.detectChanges(); },
    });
  }

  eliminarSctr(): void {
    Swal.fire({ icon: 'question', title: '¿Eliminar SCTR?', showCancelButton: true,
      confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' })
      .then((r) => {
        if (!r.isConfirmed) return;
        this.svc.deleteSctr(this.casoId!).subscribe({
          next: () => { this.sctr = null; this.editandoSctr = false; this.cdr.detectChanges(); },
          error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
        });
      });
  }

  close(): void { this.closed.emit(); }

  estadoBadge(estado: string): string {
    return { 'Abierto': 'badge badge-blue', 'En Seguimiento': 'badge badge-amber', 'Cerrado': 'badge badge-gray' }[estado] ?? 'badge badge-gray';
  }

  prioridadBadge(p: string): string {
    return { 'Alta': 'badge badge-red', 'Media': 'badge badge-amber', 'Baja': 'badge badge-green' }[p] ?? 'badge badge-gray';
  }

  sctrBadge(estado: string): string {
    return { 'Pendiente': 'badge badge-amber', 'En trámite': 'badge badge-blue', 'Aprobado': 'badge badge-green', 'Rechazado': 'badge badge-red' }[estado] ?? 'badge badge-gray';
  }
}
