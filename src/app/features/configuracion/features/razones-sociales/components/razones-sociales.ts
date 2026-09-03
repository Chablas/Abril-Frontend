import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
import { RazonSocialService } from '../services/razon-social.service';
import { BancoOpcion, RazonSocial } from '../dtos/razon-social.dto';
import { RazonSocialCreateModal } from './razon-social-create/razon-social-create';
import { RazonSocialEditModal } from './razon-social-edit/razon-social-edit';

/**
 * Configuración → Razones Sociales: las empresas del sistema, propias y de terceros.
 *
 * Filtra y pagina en memoria a propósito: es un catálogo de pocos cientos de filas que se trae
 * entero en la carga inicial junto con el catálogo de bancos, así que cambiar un filtro no vuelve
 * a pedir nada al backend.
 */
@Component({
  selector: 'app-config-razones-sociales',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Paginator, SearchInput, SearchSelect,
    AbrilPageHeaderComponent, RazonSocialCreateModal, RazonSocialEditModal,
  ],
  templateUrl: './razones-sociales.html',
  styleUrl: './razones-sociales.css',
})
export class RazonesSociales implements OnInit, OnDestroy {
  readonly tabs = CONFIGURACION_TABS;
  readonly pageSize = 15;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo', grupo: '' as '' | 'abril' | 'terceros' };

  readonly estadoOptions = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  readonly grupoOptions = [
    { value: '', label: 'Todas' },
    { value: 'abril', label: 'Del grupo Abril' },
    { value: 'terceros', label: 'De terceros' },
  ];

  all: RazonSocial[] = [];
  bancos: BancoOpcion[] = [];
  filtered: RazonSocial[] = [];
  pageItems: RazonSocial[] = [];

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  editModalOpen = false;
  editItem: RazonSocial | null = null;
  createModalOpen = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: RazonSocialService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters(1);
        this.cdr.detectChanges();
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    // App zoneless: forzamos el refresco tras el subscribe o la tabla no se pinta.
    this.service.getBandeja().subscribe({
      next: (res) => {
        this.all = res.razonesSociales ?? [];
        this.bancos = res.bancos ?? [];
        this.applyFilters(1);
        this.loading = false;
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

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const { estado, grupo } = this.filters;

    this.filtered = this.all.filter((e) => {
      if (estado === 'activo' && !e.activo) return false;
      if (estado === 'inactivo' && e.activo) return false;
      if (grupo === 'abril' && !e.esAbril) return false;
      if (grupo === 'terceros' && e.esAbril) return false;
      if (!q) return true;
      // El RUC entra en la búsqueda: es como se identifica una razón social cuando el nombre no
      // se recuerda exacto.
      return SearchInput.matches(e.nombre ?? '', q) || (e.ruc ?? '').includes(q);
    });

    this.totalRecords = this.filtered.length;
    this.totalPages = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onEstadoChange(value: string | null): void {
    this.filters.estado = (value ?? '') as '' | 'activo' | 'inactivo';
    this.applyFilters(1);
  }

  onGrupoChange(value: string | null): void {
    this.filters.grupo = (value ?? '') as '' | 'abril' | 'terceros';
    this.applyFilters(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '', grupo: '' };
    this.applyFilters(1);
  }

  onPageChange(page: number): void {
    this.applyFilters(page);
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado || this.filters.grupo);
  }

  // ── Modales ─────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.createModalOpen = true;
  }

  closeCreateModal(): void {
    this.createModalOpen = false;
  }

  onCreated(): void {
    this.createModalOpen = false;
    this.load();
  }

  openEditModal(item: RazonSocial): void {
    this.editItem = item;
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.editItem = null;
  }

  /** Reemplaza la fila editada en la tabla sin recargar toda la bandeja. */
  onEdited(actualizada: RazonSocial): void {
    const i = this.all.findIndex((e) => e.id === actualizada.id);
    if (i >= 0) this.all[i] = actualizada;
    this.applyFilters(this.currentPage);
    this.closeEditModal();
    this.cdr.detectChanges();
  }
}
