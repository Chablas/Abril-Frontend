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
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { SSOMA_TABS } from '../topico/topico.component';
import { DescansosService } from './descansos.service';
import { DescansoModalComponent } from './descanso-modal.component';
import { DescansoMedicoListItemDto, DescansoFilterDto } from './descansos.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-descansos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, Paginator, FabButton, DescansoModalComponent],
  templateUrl: './descansos.component.html',
  styleUrl: './descansos.component.css',
})
export class DescansosComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  descansos: DescansoMedicoListItemDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: DescansoFilterDto = {};

  modalVisible = false;
  descansoSeleccionadoId: number | null = null;

  readonly estadoOpts = [
    { id: '', nombre: 'Todos' },
    { id: 'Pendiente',  nombre: 'Pendiente' },
    { id: 'Aprobado',   nombre: 'Aprobado' },
    { id: 'Rechazado',  nombre: 'Rechazado' },
    { id: 'Completado', nombre: 'Completado' },
  ];

  readonly tipoOpts = [
    { id: '',            nombre: 'Todos' },
    { id: 'Particular',  nombre: 'Particular' },
    { id: 'Ocupacional', nombre: 'Ocupacional' },
  ];

  private workerChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private svc          : DescansosService,
    private errorService : ErrorService,
    private loaderService: LoaderService,
    private cdr          : ChangeDetectorRef,
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
      next: (res: PagedResponseDTO<DescansoMedicoListItemDto>) => {
        this.descansos    = res.data;
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

  limpiarFiltros(): void { this.filtros = {}; this.load(1); }

  abrirModal(id?: number): void {
    this.descansoSeleccionadoId = id ?? null;
    this.modalVisible = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.descansoSeleccionadoId = null;
    this.cdr.detectChanges();
  }

  onGuardado(): void { this.cerrarModal(); this.load(this.currentPage); }

  eliminar(d: DescansoMedicoListItemDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar descanso?',
      text: `Descanso #${d.id} — ${d.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.svc.delete(d.id).subscribe({
        next: () => { this.loaderService.hide(); this.load(this.currentPage); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId   || this.filtros.estado || this.filtros.tipo);
  }

  estadoBadgeClass(estado: string): string {
    return ({
      'Pendiente' : 'badge-amber',
      'Aprobado'  : 'badge-green',
      'Rechazado' : 'badge-red',
      'Completado': 'badge-blue',
    } as Record<string, string>)[estado] ?? 'badge-gray';
  }
}
