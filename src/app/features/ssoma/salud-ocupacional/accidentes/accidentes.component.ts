import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SSOMA_TABS } from '../topico/topico.component';
import { AccidentesService } from './accidentes.service';
import {
  AccidenteTrabajoListItemDto,
  AccidenteFilterDto,
  AccidenteTrabajoDetalleDto,
} from './accidentes.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-accidentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AbrilPageHeaderComponent, Paginator],
  templateUrl: './accidentes.component.html',
  styleUrl: './accidentes.component.css',
})
export class AccidentesComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  accidentes: AccidenteTrabajoListItemDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: AccidenteFilterDto = {};

  // Panel de detalle
  detalle: AccidenteTrabajoDetalleDto | null = null;
  loadingDetalle = false;
  detalleTab: 'info' | 'descansos' | 'citas' | 'equipos' | 'alta' = 'info';

  readonly estadoOpts = [
    { id: '', nombre: 'Todos' },
    { id: 'Abierto', nombre: 'Abierto' },
    { id: 'Cerrado', nombre: 'Cerrado' },
  ];

  private workerChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private svc: AccidentesService,
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
    this.svc.getList({ ...this.filtros, page }).subscribe({
      next: (res: PagedResponseDTO<AccidenteTrabajoListItemDto>) => {
        this.accidentes   = res.data;
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

  openDetalle(a: AccidenteTrabajoListItemDto): void {
    this.detalle = null;
    this.detalleTab = 'info';
    this.loadingDetalle = true;
    this.cdr.detectChanges();
    this.svc.getDetalle(a.id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  closeDetalle(): void {
    this.detalle = null;
    this.loadingDetalle = false;
    this.cdr.detectChanges();
  }

  cerrarAccidente(): void {
    if (!this.detalle) return;
    const id = this.detalle.id;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar accidente?',
      html: `<p style="font-size:13px">Se cerrará el accidente #${id}. Esta acción requiere que exista un alta médica registrada y sin descansos pendientes.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1b3a2d',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.cerrar(id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Accidente cerrado', timer: 1800, showConfirmButton: false });
          this.closeDetalle();
          this.load(this.currentPage);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  marcarReinduccion(a: AccidenteTrabajoListItemDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: 'Confirmar reinducción de seguridad',
      html: `<p style="font-size:13px">¿Confirmas que <strong>${a.workerNombre ?? 'el trabajador'}</strong> completó la charla de reinducción de seguridad y está autorizado para reintegrarse?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1b3a2d',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.marcarReinduccion(a.id).subscribe({
        next: () => {
          a.reinduccionCompletada = true;
          a.fechaReinduccion = new Date().toISOString().split('T')[0];
          this.cdr.detectChanges();
          Swal.fire({ icon: 'success', title: 'Reinducción registrada', timer: 1800, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId  || this.filtros.estado);
  }
}
