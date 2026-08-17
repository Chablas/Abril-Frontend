import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import {
  PortafolioKpisDto,
  ProyectoPortafolioDto,
  SemaforoPortafolio,
} from '../dtos/planeamiento-bim-portafolio.dto';

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

@Component({
  selector: 'app-planeamiento-bim-portafolio',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
  ],
  templateUrl: './portafolio.html',
  styleUrl: './portafolio.css',
})
export class PlaneamientoBimPortafolio implements OnInit {
  readonly tabs = PROJECTS_TABS;

  // ── KPIs ────────────────────────────────────────────────────
  kpis: PortafolioKpisDto | null = null;
  loadingKpis = false;
  kpisError: string | null = null;

  // ── Tabla de proyectos ──────────────────────────────────────
  proyectos: ProyectoPortafolioDto[] = [];
  loadingProyectos = false;
  proyectosError: string | null = null;

  // ── Exportar PDF ────────────────────────────────────────────
  exportingProjectId: number | null = null;
  readonly fechaExport = hoyISO();

  // ── Filtros + paginación (obligatorio en toda tabla abril-table) ──
  searchText = '';
  selectedSemaforo: SemaforoPortafolio | '' = '';
  filtrosAbiertos = false;
  readonly semaforoOptions: { value: SemaforoPortafolio | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'VERDE', label: 'Verde' },
    { value: 'AMARILLO', label: 'Amarillo' },
    { value: 'ROJO', label: 'Rojo' },
    { value: 'GRIS', label: 'Sin registros' },
  ];

  private readonly pager = new ClientPager<ProyectoPortafolioDto>();

  constructor(
    private bimService: PlaneamientoBimService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // R1 se rompe a nivel de página (no de acción individual): el backend expone
    // /kpis y /proyectos como 2 endpoints separados por diseño (mismo criterio ya
    // documentado en dashboard.ts de Fase 2a) — cada sección respeta R1 por su lado.
    this.cargarKpis();
    this.cargarProyectos();
  }

  cargarKpis(): void {
    this.loadingKpis = true;
    this.kpisError = null;

    this.bimService.getPortafolioKpis().subscribe({
      next: (data) => {
        this.kpis = data;
        this.loadingKpis = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadingKpis = false;
        this.kpisError = this.mensajeError(err, 'No se pudieron cargar los indicadores del portafolio.');
      },
    });
  }

  cargarProyectos(): void {
    this.loadingProyectos = true;
    this.proyectosError = null;

    this.bimService.getPortafolioProyectos().subscribe({
      next: (data) => {
        this.proyectos = data || [];
        this.pager.reset();
        this.loadingProyectos = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProyectos = false;
        this.proyectosError = this.mensajeError(err, 'No se pudo cargar el listado de proyectos del portafolio.');
      },
    });
  }

  // ── Filtros / paginación ────────────────────────────────────
  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.selectedSemaforo) n++;
    return n;
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.selectedSemaforo = '';
    this.onFilterChange();
  }

  get filteredProyectos(): ProyectoPortafolioDto[] {
    return this.proyectos.filter((p) => {
      const matchesTexto = !this.searchText.trim() || SearchInput.matches(p.projectNombre, this.searchText);
      const matchesSemaforo = !this.selectedSemaforo || p.semaforo === this.selectedSemaforo;
      return matchesTexto && matchesSemaforo;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredProyectos);
  }

  get pageSize(): number {
    return this.pager.pageSize;
  }

  get pagedProyectos(): ProyectoPortafolioDto[] {
    return this.pager.page(this.filteredProyectos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Presentación ────────────────────────────────────────────
  semaforoColor(semaforo: string): string {
    if (semaforo === 'VERDE') return '#1B6B3A';
    if (semaforo === 'AMARILLO') return '#D97706';
    if (semaforo === 'ROJO') return '#C0392B';
    return '#94A3B8';
  }

  semaforoLabel(p: ProyectoPortafolioDto): string {
    if (p.semaforo === 'GRIS') return `${p.projectNombre}: sin registros de carga diaria.`;
    return `${p.projectNombre}: ${p.porcentajeAvance?.toFixed(0)}% de avance (${p.cumplidosRegistros}/${p.totalRegistros} actividades cumplidas).`;
  }

  avanceBarColor(p: ProyectoPortafolioDto): string {
    if (p.porcentajeAvance === null) return '#E2E8F0';
    if (p.porcentajeAvance >= 75) return '#1B6B3A';
    if (p.porcentajeAvance >= 50) return '#2E6DB4';
    if (p.porcentajeAvance >= 25) return '#D97706';
    return '#C0392B';
  }

  get totalProyectosPorFase(): number {
    return (this.kpis?.proyectosPorFase || []).reduce((sum, f) => sum + f.cantidadProyectos, 0);
  }

  get causaTopMes(): string | null {
    return this.kpis?.causasTopMes?.causas?.[0]?.causaNombre ?? null;
  }

  get causasTopMesExtra(): number {
    const total = this.kpis?.causasTopMes?.causas?.length ?? 0;
    return Math.max(0, total - 1);
  }

  // ── Navegación / acciones ───────────────────────────────────
  irADetalle(p: ProyectoPortafolioDto): void {
    this.router.navigate(['/projects/planeamiento-bim/dashboard'], {
      queryParams: { projectId: p.projectId },
    });
  }

  exportarPdf(p: ProyectoPortafolioDto): void {
    this.exportingProjectId = p.projectId;

    this.bimService.exportarPdfProyecto(p.projectId, this.fechaExport).subscribe({
      next: (blob) => {
        this.exportingProjectId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ProgramacionDiaria_${p.projectId}_${this.fechaExport}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.exportingProjectId = null;
        const message = this.mensajeError(err, 'No se pudo generar el PDF de programación diaria.');
        Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#1E3A5F' });
      },
    });
  }

  // ── Manejo distinguible de errores (F9) ────────────────────────
  private mensajeError(err: HttpErrorResponse, defaultMsg: string): string {
    if (err.status === 401) return 'Sesión Expirada (401): su sesión no es válida o ha caducado. Por favor vuelva a iniciar sesión.';
    if (err.status === 403) return 'Acceso Denegado (403): no tiene permisos suficientes para ver esta información.';
    if (err.error?.message) return err.error.message;
    return defaultMsg;
  }
}
