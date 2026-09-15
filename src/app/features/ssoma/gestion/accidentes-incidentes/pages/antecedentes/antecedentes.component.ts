import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { AntecedenteItemDto, CatalogoItemDto } from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

@Component({
  selector: 'app-antecedentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './antecedentes.component.html',
  styleUrl: './antecedentes.component.css',
})
export class AntecedentesComponent implements OnInit {
  items: AntecedenteItemDto[] = [];
  loading = false;
  buscado = false;
  total = 0;
  page = 1;
  readonly pageSize = 20;

  proyectos: any[] = [];
  tipos: CatalogoItemDto[] = [];
  filtrosAbiertos = false;

  palabraClave = '';
  filtroProyectoId: number | undefined;
  filtroTipoId: number | undefined;
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  seleccionados = new Set<number>();
  expandidos = new Set<number>();

  constructor(
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.inicializar().subscribe({
      next: (init) => {
        this.proyectos = init.proyectos
          .map((p) => ({ projectId: p.id, projectDescription: p.nombre }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.tipos = init.tipos;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: () => this.loaderService.hide(),
    });
  }

  buscar(): void {
    if (!this.palabraClave.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa una palabra clave', text: 'Ej: incendio, caída, eléctrico...' });
      return;
    }
    this.page = 1;
    this.seleccionados.clear();
    this.cambiarPagina(1);
  }

  cambiarPagina(p: number): void {
    if (p < 1) p = 1;
    if (this.totalPages && p > this.totalPages) return;
    this.page = p;
    this.loading = true;
    this.loaderService.show();
    this.service
      .buscarAntecedentes({
        palabraClave: this.palabraClave.trim(),
        proyectoId: this.filtroProyectoId,
        tipoId: this.filtroTipoId,
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
          this.buscado = true;
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
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    if (this.buscado) this.buscar();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  toggleSeleccion(id: number): void {
    if (this.seleccionados.has(id)) this.seleccionados.delete(id);
    else this.seleccionados.add(id);
    this.cdr.detectChanges();
  }

  toggleSeleccionarTodos(): void {
    if (this.todosSeleccionados) {
      for (const item of this.items) this.seleccionados.delete(item.id);
    } else {
      for (const item of this.items) this.seleccionados.add(item.id);
    }
    this.cdr.detectChanges();
  }

  toggleExpandido(id: number): void {
    if (this.expandidos.has(id)) this.expandidos.delete(id);
    else this.expandidos.add(id);
    this.cdr.detectChanges();
  }

  get todosSeleccionados(): boolean {
    return this.items.length > 0 && this.items.every((i) => this.seleccionados.has(i.id));
  }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId) n++;
    if (this.filtroTipoId) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  async exportarPdf(): Promise<void> {
    if (this.seleccionados.size === 0) return;

    const { value: titulo } = await Swal.fire({
      icon: 'question',
      title: 'Título del reporte',
      input: 'text',
      inputLabel: 'Ej: Incendios en obra — Frontis y áreas de trabajo caliente',
      inputPlaceholder: 'Título del boletín de antecedentes',
      showCancelButton: true,
      confirmButtonText: 'Generar PDF',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'Ingresa un título' : undefined),
    });
    if (!titulo) return;

    this.loaderService.show();
    this.service
      .exportarAntecedentesPdf({
        titulo,
        palabraClave: this.palabraClave.trim(),
        ids: Array.from(this.seleccionados),
      })
      .subscribe({
        next: (blob) => {
          this.loaderService.hide();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 30000);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
