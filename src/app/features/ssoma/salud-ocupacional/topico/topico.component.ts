import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { TopicoService } from './topico.service';
import { TopicoModalComponent } from './topico-modal.component';
import { TopicoAtencionDto, TopicoFiltrosDto } from './topico.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';

export const SSOMA_TABS = [
  { label: 'Dashboard',      icono: 'ti-layout-dashboard',  route: '/ssoma/salud-ocupacional/dashboard' },
  { label: 'EMOs',           icono: 'ti-stethoscope',       route: '/ssoma/salud-ocupacional/emos' },
  { label: 'Programaciones', icono: 'ti-calendar',          route: '/ssoma/salud-ocupacional/programaciones' },
  { label: 'Interconsultas', icono: 'ti-arrows-right-left', route: '/ssoma/salud-ocupacional/interconsultas' },
  { label: 'Convalidaciones',icono: 'ti-check',             route: '/ssoma/salud-ocupacional/convalidaciones' },
  { label: 'Tópico Médico',  icono: 'ti-first-aid-kit',     route: '/ssoma/salud-ocupacional/topico' },
  { label: 'Accidentes',     icono: 'ti-alert-triangle',    route: '/ssoma/salud-ocupacional/accidentes' },
  { label: 'Descansos',      icono: 'ti-bed',               route: '/ssoma/salud-ocupacional/descansos' },
  { label: 'Revisión Descansos', icono: 'ti-checkup-list',  route: '/ssoma/salud-ocupacional/revision-descansos', featureKey: 'ssoma.salud-ocupacional.revision-descansos' },
  { label: 'Asistente Social', icono: 'ti-heart-handshake', route: '/ssoma/salud-ocupacional/asistente-social' },
  { label: 'PASO', icono: 'ti-clipboard-check', route: '/ssoma/salud-ocupacional/paso', featureKey: 'ssoma.salud-ocupacional.paso' },
  { label: 'Mi Salud', icono: 'ti-user-heart', route: '/ssoma/salud-ocupacional/mi-salud', featureKey: 'ssoma.salud-ocupacional.mi-salud' },
];

@Component({
  selector: 'app-salud-topico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FabButton,
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    SearchSelect,
    TopicoModalComponent,
    FilterTriggerButton,
    FilterModal,
    StatusBadge,
    TitleCasePipe,
  ],
  templateUrl: './topico.component.html',
  styleUrl: './topico.component.css',
})
export class TopicoComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  atenciones: TopicoAtencionDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: TopicoFiltrosDto = {};

  modalVisible = false;
  atencionSeleccionada: TopicoAtencionDto | null = null;
  filtrosAbiertos = false;

  readonly estadoOpts = [
    { value: '', label: 'Todos' },
    { value: 'Abierta', label: 'Abierta' },
    { value: 'Cerrada', label: 'Cerrada' },
  ];

  readonly tipoOpts = [
    { id: '',  nombre: 'Todos los tipos' },
    { id: '1', nombre: 'Consulta General' },
    { id: '2', nombre: 'Emergencia' },
    { id: '3', nombre: 'Control' },
    { id: '4', nombre: 'Primeros Auxilios' },
    { id: '5', nombre: 'Otro' },
  ];

  private workerChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private svc: TopicoService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.workerChange$.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => this.load(1));
    this.load(1);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getList({ ...this.filtros, page, pageSize: this.pageSize }).subscribe({
      next: (res: PagedResponseDTO<TopicoAtencionDto>) => {
        this.atenciones   = res.data;
        this.currentPage  = res.page;
        this.totalPages   = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading      = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onFilterChange(): void { this.load(1); }
  onWorkerChange(): void { this.workerChange$.next(); }
  onPageChange(p: number): void { this.load(p); }

  limpiarFiltros(): void {
    this.filtros = {};
    this.load(1);
  }

  abrirModal(a?: TopicoAtencionDto): void {
    this.atencionSeleccionada = a ?? null;
    this.modalVisible = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.atencionSeleccionada = null;
    this.cdr.detectChanges();
  }

  onGuardado(): void { this.cerrarModal(); this.load(this.currentPage); }

  cerrarAtencion(a: TopicoAtencionDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar atención?',
      text: `Atención #${a.id} — ${a.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Cerrar atención',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.cerrar(a.id).subscribe({
        next: () => this.load(this.currentPage),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  eliminar(a: TopicoAtencionDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar atención?',
      text: `Atención #${a.id} — ${a.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.delete(a.id).subscribe({
        next: () => this.load(this.currentPage),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId  || this.filtros.tipoAtencionId
           || this.filtros.estado);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.fechaDesde) n++;
    if (this.filtros.fechaHasta) n++;
    if (this.filtros.workerId) n++;
    if (this.filtros.tipoAtencionId) n++;
    if (this.filtros.estado) n++;
    return n;
  }
}
