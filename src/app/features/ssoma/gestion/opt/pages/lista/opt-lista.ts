import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { OptService } from '../../services/opt.service';
import { OptListItemDto, OptListQuery, OptPagedResult } from '../../dtos/opt.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

@Component({
  selector: 'app-opt-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './opt-lista.html',
  styleUrl: './opt-lista.css',
})
export class OptLista implements OnInit {
  result: OptPagedResult | null = null;
  loading = false;
  query: OptListQuery = { page: 1, pageSize: 20 };
  filtrosAbiertos = false;
  readonly anioActual = new Date().getFullYear();

  filtroTipo = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private optService: OptService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: OptListQuery = {
      ...this.query,
      tipoObservacion: this.filtroTipo || undefined,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
      page: 1,
    };
    this.query = q;
    this.optService.getList(q).subscribe({
      next: (res) => {
        this.result = res;
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

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.loading = true;
    this.loaderService.show();
    this.optService.getList(this.query).subscribe({
      next: (res) => {
        this.result = res;
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

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/opt', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/opt/nuevo']);
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroTipo || this.filtroFechaDesde || this.filtroFechaHasta);
  }

  readonly tipoFilterOptions = [
    { value: '', label: 'Todo tipo' },
    { value: 'Planeada', label: 'Planeada' },
    { value: 'No Planeada', label: 'No Planeada' },
  ];

  scoreClass(score?: number): string {
    if (score === undefined || score === null) return 'score-na';
    if (score >= 80) return 'score-verde';
    if (score >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  accionClass(accion?: string): string {
    if (!accion || accion === 'Ninguna') return 'accion-none';
    return 'accion-req';
  }
}
