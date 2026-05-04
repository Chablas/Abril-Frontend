import { Component, OnInit } from '@angular/core';
import { Card } from './card/card';
import { Create } from './create/create';
import { Detail } from './detail/detail';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AdjudicacionesService } from '../services/adjudicaciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectSubContractorDTO } from '../dtos/projectSubContractorDto.model';
import { ProjectSubContractorFiltersDTO } from '../dtos/projectSubContractorFilters.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';

@Component({
  standalone: true,
  selector: 'app-adjudicaciones',
  imports: [Card, Create, Detail, CommonModule, FormsModule, Paginator, SearchSelect],
  templateUrl: './adjudicaciones.html',
  styleUrl: './adjudicaciones.css',
})
export class Adjudicaciones implements OnInit {
  items: ProjectSubContractorDTO[] = [];
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;
  projects: ProjectSimpleDTO[] = [];

  filters: ProjectSubContractorFiltersDTO = {
    page: 1,
    projectId: 0,
    search: '',
  };

  showCreateModal = false;
  selectedItem: ProjectSubContractorDTO | null = null;

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadPagedWithFilters();
  }

  private loadPagedWithFilters(): void {
    // Primera carga: obtener lista + filtros en una sola llamada
    this.loaderService.show();
    this.adjudicacionesService.getAdjudicacionPagedWithFilters(this.filters).subscribe({
      next: (response) => {
        this.items = response.paged.data;
        this.currentPage = response.paged.page;
        this.totalPages = response.paged.totalPages;
        this.totalRecords = response.paged.totalRecords;
        this.projects = response.filters.projects;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.loaderService.hide();
      },
    });
  }

  load(page: number = 1) {
    this.filters.page = page;
    this.loaderService.show();
    this.adjudicacionesService.getAdjudicacionPaged(this.filters).subscribe({
      next: (response) => {
        this.items = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.totalRecords = response.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openDetail(item: ProjectSubContractorDTO) {
    this.selectedItem = item;
  }
}
