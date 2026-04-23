import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { InterconsultaService } from '../services/interconsulta.service';
import {
  InterconsultaListDto,
  InterconsultaQueryParams,
} from '../dtos/interconsulta.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  estadoBadgeClass,
  estadoInterconsultaStyle,
} from '../shared/estado.utils';
import { InterconsultaDetail } from './components/interconsulta-detail/interconsulta-detail';

interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-salud-interconsultas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    InterconsultaDetail,
  ],
  templateUrl: './interconsultas.html',
  styleUrl: './interconsultas.css',
})
export class Interconsultas implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: '',
  };

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Atendida', nombre: 'Atendida' },
    { id: 'Cancelada', nombre: 'Cancelada' },
  ];

  items: InterconsultaListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  selectedId: number | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: InterconsultaService,
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
    const query: InterconsultaQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      estado: this.filters.estado || undefined,
    };
    this.service.getInterconsultas(query).subscribe({
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
    this.filters = { search: '', estado: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openDetail(item: InterconsultaListDto): void {
    this.selectedId = item.id;
  }

  closeDetail(): void {
    this.selectedId = null;
  }

  onSaved(): void {
    this.load(this.currentPage);
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoInterconsultaStyle(estado));
  }

  isPendientePulse(estado: string): boolean {
    return estadoInterconsultaStyle(estado).pulse === true;
  }

  diasPendiente(item: InterconsultaListDto): number {
    if (item.estado !== 'Pendiente') return item.diasPendiente;
    // Fallback: si backend no envía dias, lo calculamos.
    if (item.diasPendiente != null && item.diasPendiente >= 0) return item.diasPendiente;
    const derivacion = new Date(item.fechaDerivacion);
    if (isNaN(derivacion.getTime())) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    derivacion.setHours(0, 0, 0, 0);
    const ms = hoy.getTime() - derivacion.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  diasPendienteClass(dias: number): string {
    if (dias < 3) return 'text-gray-600 bg-gray-100';
    if (dias < 7) return 'text-yellow-700 bg-yellow-100';
    if (dias < 15) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }
}
