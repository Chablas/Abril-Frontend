import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EmoService } from '../../../ssoma/salud-ocupacional/services/emo.service';
import { WorkerService } from '../../../ssoma/salud-ocupacional/services/worker.service';
import {
  EmoPorTrabajadorDto,
  EmoPorTrabajadorQuery,
} from '../../../ssoma/salud-ocupacional/dtos/emo.model';
import {
  aptitudBadgeClass,
  aptitudDotColor,
  SIN_EMO_COLOR,
  SIN_EMO_LABEL,
} from '../../../ssoma/salud-ocupacional/shared/aptitud.utils';
import { WorkerEditForm } from './components/worker-edit-form/worker-edit-form';

@Component({
  selector: 'app-config-workers',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, WorkerEditForm],
  templateUrl: './workers.html',
  styleUrl: './workers.css',
})
export class Workers implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = {
    search: '',
    aptitud: '',
    estado: '',
  };

  items: EmoPorTrabajadorDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  formOpen = false;
  formMode: 'create' | 'edit' = 'edit';
  formWorker: EmoPorTrabajadorDto | null = null;

  aptitudOptions = [
    { id: '', nombre: 'Todas las aptitudes' },
    { id: 'Apto', nombre: 'Apto' },
    { id: 'Apto con Restricciones', nombre: 'Apto con Restricciones' },
    { id: 'No Apto', nombre: 'No Apto' },
    { id: 'Observado', nombre: 'Observado' },
    { id: 'Pendiente', nombre: 'Pendiente' },
  ];

  estadoOptions = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Vigente', nombre: 'Vigente' },
    { id: 'Por Vencer', nombre: 'Por Vencer' },
    { id: 'Vencido', nombre: 'Vencido' },
    { id: 'Anulado', nombre: 'Anulado' },
  ];

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: EmoService,
    private workerService: WorkerService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: EmoPorTrabajadorQuery = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      aptitud: this.filters.aptitud || undefined,
      estado: this.filters.estado || undefined,
    };
    this.service.getEmosPorTrabajador(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.filters = { search: '', aptitud: '', estado: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formWorker = null;
    this.formOpen = true;
  }

  openEdit(worker: EmoPorTrabajadorDto): void {
    this.formMode = 'edit';
    this.formWorker = worker;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formWorker = null;
  }

  onSaved(): void {
    this.closeForm();
    this.load(this.currentPage);
  }

  esActivo(item: EmoPorTrabajadorDto): boolean {
    return (item.estadoWorker ?? 'ACTIVO') === 'ACTIVO';
  }

  retirar(worker: EmoPorTrabajadorDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Retirar trabajador?',
      text: `¿Está seguro que desea retirar a ${worker.nombreCompleto}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, retirar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.workerService.retirarWorker(worker.workerId).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Trabajador retirado',
            timer: 1500,
            showConfirmButton: false,
          });
          this.load(this.currentPage);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  estadoEmoClass(estado?: string): string {
    switch (estado) {
      case 'Vigente':
        return 'chip-green';
      case 'Por Vencer':
        return 'chip-orange';
      case 'Vencido':
        return 'chip-red';
      case 'Anulado':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  aptitudColor(item: EmoPorTrabajadorDto): string {
    if (!item.tieneEmo) return SIN_EMO_COLOR;
    return aptitudDotColor(item.aptitud);
  }

  aptitudBadge(item: EmoPorTrabajadorDto): string {
    return item.tieneEmo ? aptitudBadgeClass(item.aptitud) : 'bg-gray-100 text-gray-600 border-gray-200';
  }

  aptitudLabel(item: EmoPorTrabajadorDto): string {
    if (!item.tieneEmo) return SIN_EMO_LABEL;
    return item.aptitud ?? '—';
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.aptitud || this.filters.estado);
  }
}
