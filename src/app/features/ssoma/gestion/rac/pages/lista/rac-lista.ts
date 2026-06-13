import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RacService } from '../../services/rac.service';
import { RacListItemDto, RacListQuery, RacPagedResult } from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RacNavComponent } from '../../components/rac-nav/rac-nav.component';

@Component({
  selector: 'app-rac-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RacNavComponent],
  templateUrl: './rac-lista.html',
  styleUrl: './rac-lista.css',
})
export class RacLista implements OnInit {
  result: RacPagedResult<RacListItemDto> | null = null;
  loading = false;
  query: RacListQuery = { page: 1, pageSize: 20 };

  filtroEstado = '';
  filtroSeveridad = '';
  filtroTipo = '';
  filtroSoloConPenalidad = false;

  readonly anioActual = new Date().getFullYear();

  constructor(
    private racService: RacService,
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
    const q: RacListQuery = {
      ...this.query,
      estado: this.filtroEstado || undefined,
      severidad: this.filtroSeveridad || undefined,
      tipo: this.filtroTipo || undefined,
      soloConPenalidad: this.filtroSoloConPenalidad || undefined,
      page: 1,
    };
    this.query = q;
    this.racService.getList(q).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroSeveridad = '';
    this.filtroTipo = '';
    this.filtroSoloConPenalidad = false;
    this.load();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/rac', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/rac/nuevo']);
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroEstado || this.filtroSeveridad || this.filtroTipo || this.filtroSoloConPenalidad);
  }

  severidadClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      case 'BAJO':    return 'badge-bajo';
      default:        return 'badge-default';
    }
  }

  estadoClass(est: string): string {
    switch (est) {
      case 'Abierto': return 'estado-abierto';
      case 'Cerrado': return 'estado-cerrado';
      default:        return '';
    }
  }
}
