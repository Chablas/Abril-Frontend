import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { FlashReportListItemDto, FlashReportInicializarDto, CatalogoItemDto } from '../../accidente-incidente.dtos';
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
  items: FlashReportListItemDto[] = [];
  loading = true;
  total = 0;
  page = 1;
  readonly pageSize = 20;

  proyectos: any[] = [];
  tipos: CatalogoItemDto[] = [];
  filtrosAbiertos = false;

  filtroProyectoId: number | undefined;
  filtroTipoId: number | undefined;
  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.inicializar().subscribe({
      next: (init) => {
        this.proyectos = init.proyectos.map((p) => ({ projectId: p.id, projectDescription: p.nombre }));
        this.tipos = init.tipos;
        this.loaderService.hide();
        this.cdr.markForCheck();
        this.load();
      },
      error: () => {
        this.loaderService.hide();
        this.load();
      },
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.page = 1;
    this.service
      .getList({
        proyectoId: this.filtroProyectoId,
        tipoId: this.filtroTipoId,
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
        tipoId: this.filtroTipoId,
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
    this.filtroTipoId = undefined;
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
      next: () => { this.loaderService.hide(); this.load(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }
  get pagesArray(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get hayFiltros(): boolean {
    return !!(this.filtroProyectoId || this.filtroTipoId || this.filtroEstado || this.filtroFechaDesde || this.filtroFechaHasta);
  }

  nivelLabel(n?: number): string {
    const labels = ['', 'Sin daño', 'Leve', 'c/tiempo perdido', 'Grave', 'Fatal', 'Fatal múltiple'];
    return n && n >= 1 && n <= 6 ? `N${n} - ${labels[n]}` : '—';
  }

  nivelClass(n?: number): string {
    if (!n) return '';
    if (n <= 2) return 'nivel-bajo';
    if (n <= 3) return 'nivel-medio';
    if (n <= 4) return 'nivel-alto';
    return 'nivel-critico';
  }

  tipoClass(codigo: string): string {
    const map: Record<string, string> = { AC: 'tipo-accidente', IN: 'tipo-incidente', NC: 'tipo-nc', AL: 'tipo-alerta' };
    return map[codigo] ?? 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Enviado') return 'estado-enviado';
    if (estado === 'Borrador') return 'estado-borrador';
    return 'estado-abierto';
  }
}
