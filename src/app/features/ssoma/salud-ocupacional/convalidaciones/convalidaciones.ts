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
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import { ProyectoHabilitadoService } from '../../shared/services/proyecto-habilitado.service';
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
import { ConvalidacionReview } from './components/convalidacion-review/convalidacion-review';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';

interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-salud-convalidaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    ConvalidacionReview,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './convalidaciones.html',
  styleUrl: './convalidaciones.css',
})
export class Convalidaciones implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  readonly pageSize = 15;

  filters = {
    search: '',
    resultado: '',
    proyectoId: '',
    empresaDestinoId: '',
    tipoEmoId: '',
  };

  resultadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los resultados' },
    { id: 'Aprobada', nombre: 'Aprobada' },
    { id: 'Rechazada', nombre: 'Rechazada' },
    { id: 'Pendiente', nombre: 'Pendiente' },
  ];

  proyectoOptions: FilterOption[] = [{ id: '', nombre: 'Todos los proyectos' }];
  empresaDestinoOptions: FilterOption[] = [{ id: '', nombre: 'Todas las razones sociales' }];
  tipoEmoOptions: FilterOption[] = [{ id: '', nombre: 'Todos los tipos' }];

  items: ConvalidacionListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  reviewOpen = false;
  selectedItem: ConvalidacionListDto | null = null;
  descargandoPdfId: number | null = null;
  filtrosAbiertos = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: ConvalidacionService,
    private catalogosService: CatalogosSaludService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.loadCatalogos();
    this.load(1);
  }

  private loadCatalogos(): void {
    this.proyectoService.getHabilitados().subscribe({
      next: (proyectos) => {
        this.proyectoOptions = [
          { id: '', nombre: 'Todos los proyectos' },
          ...proyectos.map((p) => ({ id: String(p.projectId), nombre: p.projectDescription })),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Catálogo secundario: si falla, se mantiene solo la opción "Todos".
      },
    });

    this.catalogosService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresaDestinoOptions = [
          { id: '', nombre: 'Todas las razones sociales' },
          ...empresas.map((e) => ({ id: String(e.id), nombre: e.nombre })),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Catálogo secundario: si falla, se mantiene solo la opción "Todas".
      },
    });

    this.catalogosService.getEmoTipos().subscribe({
      next: (tipos) => {
        this.tipoEmoOptions = [
          { id: '', nombre: 'Todos los tipos' },
          ...tipos.map((t) => ({ id: String(t.id), nombre: t.nombre })),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Catálogo secundario: si falla, se mantiene solo la opción "Todos".
      },
    });
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
      proyectoId: this.filters.proyectoId ? Number(this.filters.proyectoId) : undefined,
      empresaDestinoId: this.filters.empresaDestinoId ? Number(this.filters.empresaDestinoId) : undefined,
      tipoEmoId: this.filters.tipoEmoId ? Number(this.filters.tipoEmoId) : undefined,
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
    this.filters = { search: '', resultado: '', proyectoId: '', empresaDestinoId: '', tipoEmoId: '' };
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openReview(item: ConvalidacionListDto): void {
    this.selectedItem = item;
    this.reviewOpen = true;
  }

  closeReview(): void {
    this.reviewOpen = false;
    this.selectedItem = null;
  }

  onReviewed(): void {
    this.reviewOpen = false;
    this.selectedItem = null;
    this.load(this.currentPage);
  }

  resultadoClass(r: string): string {
    return estadoBadgeClass(resultadoConvalidacionStyle(r));
  }

  diasClass(dias: number | null): string {
    if (dias == null) return '';
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number | null): string {
    if (dias == null) return '—';
    return diasVencerStyle(dias).label;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.resultado ||
      this.filters.proyectoId ||
      this.filters.empresaDestinoId ||
      this.filters.tipoEmoId
    );
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.resultado) n++;
    if (this.filters.proyectoId) n++;
    if (this.filters.empresaDestinoId) n++;
    if (this.filters.tipoEmoId) n++;
    return n;
  }

  descargarPdf(item: ConvalidacionListDto, event: Event): void {
    event.stopPropagation();
    if (this.descargandoPdfId) return;
    this.descargandoPdfId = item.id;
    this.service.descargarPdf(item.id).subscribe({
      next: (blob) => {
        this.descargandoPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Convalidacion_${item.workerDni}_${item.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoPdfId = null;
        this.errorService.handleError(err);
      },
    });
  }
}
