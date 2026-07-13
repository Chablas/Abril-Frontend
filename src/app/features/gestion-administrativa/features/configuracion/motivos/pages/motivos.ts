import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaMotivoSalidaService } from '../services/motivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GaMotivoSalidaConfigItemDto } from '../dtos/ga-motivo.dto';
import { GaMotivoCreate } from '../components/create/create';
import { GaMotivoEdit } from '../components/edit/edit';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  standalone: true,
  selector: 'app-ga-motivos',
  imports: [
    CommonModule,
    GaMotivoCreate,
    GaMotivoEdit,
    StatusBadge,
    AbrilPageHeaderComponent,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './motivos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaMotivos implements OnInit {
  anioActual = new Date().getFullYear();
  motivos: GaMotivoSalidaConfigItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  motivoToEdit: GaMotivoSalidaConfigItemDto | null = null;

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<GaMotivoSalidaConfigItemDto>();

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredMotivos(): GaMotivoSalidaConfigItemDto[] {
    return this.motivos.filter((m) => {
      const matchesTexto = !this.searchText.trim() || SearchInput.matches(m.descripcion ?? '', this.searchText);
      const matchesEstado = this.estadoFilter === null || m.activo === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredMotivos);
  }

  get pagedMotivos(): GaMotivoSalidaConfigItemDto[] {
    return this.pager.page(this.filteredMotivos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  constructor(
    private service: GaMotivoSalidaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.motivos = data;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(motivo: GaMotivoSalidaConfigItemDto): void {
    this.loaderService.show();
    this.service.toggle(motivo.id).subscribe({
      next: (res) => {
        motivo.activo = res.activo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(motivo: GaMotivoSalidaConfigItemDto): void {
    this.motivoToEdit = motivo;
    this.showEditModal = true;
  }
}
