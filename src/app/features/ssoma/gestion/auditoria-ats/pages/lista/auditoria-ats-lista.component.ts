import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuditoriaAtsService } from '../../auditoria-ats.service';
import { AuditoriaAtsListItemDto } from '../../auditoria-ats.dtos';
import { SCORE_CONFIG } from '../nueva/auditoria-ats-nueva.component';
import { ProjectService } from '../../../../../../core/services/project.service';
import { TrabajadorHabService } from '../../../../../habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../habilitacion/dtos/trabajador.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

@Component({
  selector: 'app-auditoria-ats-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, SearchSelect, AbrilPageHeaderComponent],
  templateUrl: './auditoria-ats-lista.component.html',
  styleUrl: './auditoria-ats-lista.component.css',
})
export class AuditoriaAtsListaComponent implements OnInit {
  items: AuditoriaAtsListItemDto[] = [];
  loading = false;
  loadingCatalogos = true;

  workers: WorkerHabilitacionListDto[] = [];
  proyectos: any[] = [];

  // Filtros
  filtroAuditadoId: number | null = null;
  filtroProyectoId: number | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroEstado = '';

  // Paginación
  page = 1;
  pageSize = 20;
  total = 0;

  readonly scoreConfig = SCORE_CONFIG;

  constructor(
    private service: AuditoriaAtsService,
    private projectService: ProjectService,
    private trabajadorService: TrabajadorHabService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorService.getTrabajadores({ pageSize: 9999 }),
    }).subscribe({
      next: ({ proyectos, workers }) => {
        this.proyectos = proyectos.data;
        this.workers = workers.data;
        this.loadingCatalogos = false;
        this.cargar();
      },
      error: () => {
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargar(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.service
      .getList({
        auditadoWorkerId: this.filtroAuditadoId ?? undefined,
        proyectoId: this.filtroProyectoId ?? undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        estado: this.filtroEstado || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  buscar(): void {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroAuditadoId = null;
    this.filtroProyectoId = null;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroEstado = '';
    this.buscar();
  }

  irPagina(p: number): void {
    this.page = p;
    this.cargar();
  }

  get totalPaginas(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  nivelConfig(nivel?: string): (typeof SCORE_CONFIG)[number] | null {
    if (!nivel) return null;
    return SCORE_CONFIG.find((s) => s.label === nivel) ?? null;
  }

  verDetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/auditoria-ats', id]);
  }

  nueva(): void {
    this.router.navigate(['/ssoma/gestion/auditoria-ats/nueva']);
  }
}
