import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { AccidenteIncidenteListItemDto } from '../../accidente-incidente.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './accidente-lista.component.html',
  styleUrl: './accidente-lista.component.css',
})
export class AccidenteListaComponent implements OnInit {
  items: AccidenteIncidenteListItemDto[] = [];
  loading = true;
  total = 0;
  page = 1;
  readonly pageSize = 20;

  proyectos: any[] = [];
  filtrosAbiertos = false;

  filtroProyectoId: number | undefined;
  filtroTipo = '';
  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private service: AccidenteIncidenteService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.getProjectsPaged({ pageSize: 200, active: true }).subscribe({
      next: (res) => {
        this.proyectos = res.data;
        this.cdr.markForCheck();
        this.load();
      },
      error: () => this.load(),
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.page = 1;
    this.service
      .getList({
        proyectoId: this.filtroProyectoId,
        tipo: this.filtroTipo || undefined,
        estado: this.filtroEstado || undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        page: 1,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
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
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loading = true;
    this.loaderService.show();
    this.service
      .getList({
        proyectoId: this.filtroProyectoId,
        tipo: this.filtroTipo || undefined,
        estado: this.filtroEstado || undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        page: p,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
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
    this.filtroProyectoId = undefined;
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes/nuevo']);
  }

  async confirmarEliminar(event: Event, id: number): Promise<void> {
    event.stopPropagation();
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar registro?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    this.loaderService.show();
    this.service.eliminar(id).subscribe({
      next: () => {
        this.loaderService.hide();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get hayFiltros(): boolean {
    return !!(this.filtroProyectoId || this.filtroTipo || this.filtroEstado || this.filtroFechaDesde || this.filtroFechaHasta);
  }

  tipoClass(tipo: string): string {
    return tipo === 'Accidente' ? 'tipo-accidente' : 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Cerrado') return 'estado-cerrado';
    if (estado === 'En Investigación') return 'estado-investigacion';
    return 'estado-abierto';
  }
}
