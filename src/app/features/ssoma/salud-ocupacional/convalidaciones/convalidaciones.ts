import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import {
  ConvalidacionQueryParams,
  ConvalidacionService,
} from '../services/convalidacion.service';
import { ConvalidacionListDto } from '../dtos/convalidacion.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  estadoBadgeClass,
  resultadoConvalidacionStyle,
} from '../shared/estado.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../shared/dias-vencer.utils';
import { ConvalidacionCreate } from './components/convalidacion-create/convalidacion-create';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';

interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-salud-convalidaciones',
  standalone: true,
  imports: [FabButton, 
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    ConvalidacionCreate,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './convalidaciones.html',
  styleUrl: './convalidaciones.css',
})
export class Convalidaciones implements OnInit, OnDestroy {
  anioActual = new Date().getFullYear();
  readonly pageSize = 15;

  filters = {
    search: '',
    resultado: '',
  };

  resultadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los resultados' },
    { id: 'Aprobada', nombre: 'Aprobada' },
    { id: 'Rechazada', nombre: 'Rechazada' },
    { id: 'Pendiente', nombre: 'Pendiente' },
  ];

  items: ConvalidacionListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  createOpen = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: ConvalidacionService,
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
    const query: ConvalidacionQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      resultado: this.filters.resultado || undefined,
    };
    this.service.getConvalidaciones(query).subscribe({
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
    this.filters = { search: '', resultado: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  onCreated(): void {
    this.createOpen = false;
    this.load(this.currentPage);
  }

  resultadoClass(r: string): string {
    return estadoBadgeClass(resultadoConvalidacionStyle(r));
  }

  diasClass(dias: number): string {
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number): string {
    return diasVencerStyle(dias).label;
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.resultado);
  }
}
