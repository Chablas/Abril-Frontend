import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { GestionVecinosService, VecinoFilter } from '../services/gestion-vecinos.service';
import { VecinoFormOptionsDTO, VecinoListItemDTO } from '../dtos/gestion-vecinos.dto';
import { GestionVecinosList } from './list/gestion-vecinos-list';
import { GestionVecinosCard } from './card/gestion-vecinos-card';
import { GestionVecinosDetail } from './detail/gestion-vecinos-detail';
import { GestionVecinosAdd } from './add/gestion-vecinos-add';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { ViewToggle } from '../../../../shared/components/view-toggle/view-toggle';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ViewToggleMode } from '../../../../shared/components/view-toggle/view-toggle.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';

@Component({
  selector: 'app-gestion-vecinos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GestionVecinosList,
    GestionVecinosCard,
    GestionVecinosDetail,
    GestionVecinosAdd,
    Paginator,
    ViewToggle,
    SearchSelect,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './gestion-vecinos.html',
})
export class GestionVecinos implements OnInit {
  vecinos: VecinoListItemDTO[] = [];
  options: VecinoFormOptionsDTO = { projects: [], colindancias: [], tiposConstruccion: [] };

  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;

  // Filtros
  searchProjectId: number | null = null;
  searchColindanciaId: number | null = null;
  searchText = '';

  viewMode = 'table';
  selectedVecino: VecinoListItemDTO | null = null;
  showAddModal = false;

  viewModes: ViewToggleMode[] = [
    {
      value: 'table',
      label: 'Tabla',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    },
    {
      value: 'card',
      label: 'Tarjetas',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
  ];

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getPageData({ page: 1 }).subscribe({
      next: (res) => {
        this.options = res.options;
        this.applyPaged(res.vecinos);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private currentFilter(page: number): VecinoFilter {
    return {
      page,
      projectId: this.searchProjectId ?? undefined,
      vecinoColindanciaId: this.searchColindanciaId ?? undefined,
      search: this.searchText.trim() || undefined,
    };
  }

  private applyPaged(res: { data: VecinoListItemDTO[]; page: number; totalPages: number; totalRecords: number }): void {
    this.vecinos = res.data;
    this.currentPage = res.page;
    this.totalPages = res.totalPages;
    this.totalRecords = res.totalRecords;
  }

  load(page: number): void {
    this.loaderService.show();
    this.service.getList(this.currentFilter(page)).subscribe({
      next: (res) => {
        this.applyPaged(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  search(): void {
    this.load(1);
  }

  openDetail(item: VecinoListItemDTO): void {
    this.selectedVecino = item;
  }

  closeDetail(): void {
    this.selectedVecino = null;
  }

  openAdd(): void {
    this.showAddModal = true;
  }

  closeAdd(): void {
    this.showAddModal = false;
  }

  onCreated(): void {
    this.showAddModal = false;
    this.load(1);
  }
}
