import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportResponseControlCreate } from './report-response-control-create/report-response-control-create';
import { List } from './list/list';
import { ReportCards } from './report-cards/report-cards';
import { ResidentReportIncidenceDTO } from '../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { ProjectSimpleDTO } from '../../../core/dtos/project/projectSimple.model';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { RespondReportModal } from './list/respond-report-modal/respond-report-modal';
import { ReportViewModal } from './list/report-view-modal/report-view-modal';
import { ResidentReportIncidenceService } from '../../../core/services/residentReportIncidence.service';
import { ProjectResidentService } from '../../../core/services/projectResident.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

import { PROJECTS_TABS } from '../shared/projects-tabs';

type ViewMode = 'cards' | 'table';

@Component({
  selector: 'app-report-response-control',
  imports: [
    CommonModule,
    ReportResponseControlCreate,
    List,
    ReportCards,
    Paginator,
    AbrilPageHeaderComponent,
    FabButton,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    RespondReportModal,
    ReportViewModal,
  ],
  templateUrl: './report-response-control.html',
  styleUrl: './report-response-control.css',
})
export class ReportResponseControl implements OnInit {
  readonly tabs = PROJECTS_TABS;
  readonly Roles = Roles;
  anioActual = new Date().getFullYear();

  // ── Vista (tarjetas / tabla) ─────────────────────────────────────────
  currentView: ViewMode = 'table';

  // ── Datos + estado de carga ──────────────────────────────────────────
  reports: ResidentReportIncidenceDTO[] = [];
  loading = false;

  // ── Paginación (server-side) ─────────────────────────────────────────
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  // ── Filtros (server-side, ambos opcionales) ──────────────────────────
  filtros: { projectId: number | null; stateId: number | null } = {
    projectId: null,
    stateId: null,
  };

  filtrosAbiertos = false;

  /** Opciones de proyecto para el filtro (carga perezosa al abrir filtros). */
  projectOptions: ProjectSimpleDTO[] = [];
  private projectsLoaded = false;

  /** Estado: LEVANTADO → stateId 5, NO LEVANTADO → stateId 6 (confirmado por backend). */
  readonly estadoOptions = [
    { value: null, label: 'Todos los estados' },
    { value: 5, label: 'Levantado' },
    { value: 6, label: 'No levantado' },
  ];

  // ── Modales ──────────────────────────────────────────────────────────
  showCreateModal = false;
  showResponseModal = false;
  showReportViewModal = false;
  selectedReportIncidenceId = 0;
  selectedIncidence: ResidentReportIncidenceDTO | null = null;

  constructor(
    public authService: AuthService,
    private reportService: ResidentReportIncidenceService,
    private projectResidentService: ProjectResidentService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // 1 acción = 1 HTTP: en el init solo se carga la lista. Los proyectos del filtro
    // se piden recién cuando el usuario abre el panel de filtros (ver abrirFiltros()).
    this.load();
  }

  // ── Carga de datos ───────────────────────────────────────────────────
  load(page: number = 1): void {
    this.loading = true;
    this.loaderService.show();
    this.reportService.getReportsPaged(page, this.filtros.projectId, this.filtros.stateId).subscribe({
      next: (res) => {
        this.reports = res.data;
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.pageSize = res.pageSize;
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Cualquier cambio de filtro reinicia a la página 1. */
  onSearch(): void {
    this.load(1);
  }

  /** Solo el paginador navega conservando los filtros vigentes. */
  onPageChange(page: number): void {
    this.load(page);
  }

  limpiarFiltros(): void {
    this.filtros = { projectId: null, stateId: null };
    this.load(1);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.projectId != null) n++;
    if (this.filtros.stateId != null) n++;
    return n;
  }

  abrirFiltros(): void {
    this.filtrosAbiertos = true;
    if (!this.projectsLoaded) this.loadProjects();
  }

  private loadProjects(): void {
    this.projectResidentService.getProjectsDescription().subscribe({
      next: (data) => {
        this.projectOptions = data;
        this.projectsLoaded = true;
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Vista ────────────────────────────────────────────────────────────
  setView(view: ViewMode): void {
    this.currentView = view;
  }

  // ── Modales ──────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  openResponseModal(item: ResidentReportIncidenceDTO): void {
    this.selectedReportIncidenceId = item.residentReportIncidenceId;
    this.showResponseModal = true;
  }

  openReportViewModal(item: ResidentReportIncidenceDTO): void {
    this.selectedIncidence = item;
    this.showReportViewModal = true;
  }

  /** Tras crear: vuelve a la primera página. Tras responder: conserva la página vigente. */
  onCreated(): void {
    this.load(1);
  }

  onResponded(): void {
    this.load(this.currentPage);
  }
}
