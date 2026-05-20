import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import {
  ProjectsDashboardService,
  ProjectsDashboardParams,
} from '../../../core/services/projects-dashboard.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import {
  ProjectsDashboardDTO,
  ProjectsDashboardFiltersDTO,
} from '../../../core/dtos/projects-dashboard/projectsDashboard.model';
import { SearchSelect } from '../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-projects-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './projects-dashboard.html',
  styleUrl: './projects-dashboard.css',
})
export class ProjectsDashboard implements OnInit {
  loading = false;
  data: ProjectsDashboardDTO | null = null;

  proyectos: ProjectsDashboardFiltersDTO['proyectos'] = [];
  estados: string[] = [];
  responsablesArqCom: ProjectsDashboardFiltersDTO['responsablesArqCom'] = [];

  selectedProyectoId: number | null = null;
  selectedEstado = '';
  selectedResponsableId: number | null = null;

  constructor(
    private service: ProjectsDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loaderService.show();
    forkJoin({
      filters: this.service.getFilters(),
      data: this.service.getDashboard({}),
    }).subscribe({
      next: ({ filters, data }) => {
        this.proyectos = filters.proyectos ?? [];
        this.estados = filters.estados ?? [];
        this.responsablesArqCom = filters.responsablesArqCom ?? [];
        this.data = data;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  clearFilters(): void {
    this.selectedProyectoId = null;
    this.selectedEstado = '';
    this.selectedResponsableId = null;
    this.loadDashboard();
  }

  avanceBarWidth(value: number): string {
    return `${Math.min(100, Math.max(0, value))}%`;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.loaderService.show();
    const params: ProjectsDashboardParams = {
      proyectoId: this.selectedProyectoId,
      estado: this.selectedEstado || undefined,
      responsableArqComId: this.selectedResponsableId,
    };
    this.service.getDashboard(params).subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }
}
