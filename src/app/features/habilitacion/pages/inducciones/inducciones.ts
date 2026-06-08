import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { InduccionService } from '../../services/induccion.service';
import { InduccionListDto } from '../../dtos/induccion.model';
@Component({
  selector: 'app-hab-inducciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inducciones.html',
  styleUrl: './inducciones.css',
})
export class Inducciones implements OnInit {
  inducciones: InduccionListDto[] = [];
  loading = false;

  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  readonly hoy = new Date().toISOString().substring(0, 10);

  constructor(
    private induccionService: InduccionService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();

    const params: Record<string, unknown> = {
      empresaId: this.authService.getEmpresaId(),
    };
    if (this.filtroEstado) params['estado'] = this.filtroEstado;
    if (this.filtroFechaDesde) params['fechaDesde'] = this.filtroFechaDesde;
    if (this.filtroFechaHasta) params['fechaHasta'] = this.filtroFechaHasta;

    this.induccionService.getList(params).subscribe({
      next: (res) => {
        this.inducciones = res ?? [];
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onFilterChange(): void {
    this.load();
  }

  clearFilters(): void {
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.load();
  }

  getBadge(item: InduccionListDto): { label: string; clase: string } {
    if (item.estado === 'REALIZADA') return { label: 'Completada', clase: 'badge-green' };
    if (item.ingresoConfirmado) return { label: 'Ingresó', clase: 'badge-yellow' };
    if (item.estado === 'FALTA') return { label: 'No asistió', clase: 'badge-red' };
    if (item.estado === 'PROGRAMADA' && item.fechaProgramada < this.hoy) {
      return { label: 'No asistió', clase: 'badge-red' };
    }
    if (item.estado === 'PROGRAMADA') return { label: 'Programada', clase: 'badge-blue' };
    return { label: item.estado ?? 'Desconocido', clase: 'badge-gray' };
  }

  isNoAsistio(item: InduccionListDto): boolean {
    return item.estado === 'FALTA' || (item.estado === 'PROGRAMADA' && !item.ingresoConfirmado && item.fechaProgramada < this.hoy);
  }
}
