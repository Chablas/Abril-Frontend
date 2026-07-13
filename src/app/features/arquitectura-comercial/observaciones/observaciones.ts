import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ObservacionesService } from '../../../core/services/arquitectura-comercial/observaciones.service';
import { ErrorService } from '../../../core/services/error.service';
import { LoaderService } from '../../../core/services/loader.service';
import {
  ObservacionListItemDTO,
  ObservacionFiltrosDTO,
} from '../../../core/dtos/arquitectura-comercial/observaciones.model';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { AbrilBulkActionDirective } from '../../../shared/directives/abril-bulk-action.directive';
import { NuevaObservacion } from './components/nueva-observacion/nueva-observacion';
import { LevantarObservacion } from './components/levantar-observacion/levantar-observacion';
import { DEFAULT_PAGE_SIZE } from '../../../shared/constants/pagination';

@Component({
  standalone: true,
  selector: 'app-arq-comercial-observaciones',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    AbrilBulkActionDirective,
    NuevaObservacion,
    LevantarObservacion,
  ],
  templateUrl: './observaciones.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class Observaciones implements OnInit {
  anioActual = new Date().getFullYear();

  items: ObservacionListItemDTO[] = [];
  total = 0;
  pagina = 1;
  porPagina = DEFAULT_PAGE_SIZE;

  filtros: ObservacionFiltrosDTO = { proyectos: [], partidas: [], estados: [] };

  proyectoId: number | null = null;
  estado: string | null = null;
  partida: string | null = null;
  searchText = '';
  filtrosAbiertos = false;

  showNuevaModal = false;
  showLevantarModal = false;
  observacionParaLevantar: ObservacionListItemDTO | null = null;

  get filtrosActivos(): number {
    let n = 0;
    if (this.proyectoId) n++;
    if (this.estado) n++;
    if (this.partida) n++;
    if (this.searchText.trim()) n++;
    return n;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }

  get estadoOptions(): { value: string; label: string }[] {
    return this.filtros.estados.map((e) => ({ value: e, label: e }));
  }

  get partidaOptions(): { value: string; label: string }[] {
    return this.filtros.partidas.map((p) => ({ value: p, label: p }));
  }

  constructor(
    private service: ObservacionesService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
    this.load();
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data) => {
        this.filtros = {
          ...data,
          proyectos: [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        };
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loaderService.show();
    this.service
      .getObservaciones({
        proyectoId: this.proyectoId,
        estado: this.estado,
        partida: this.partida,
        search: this.searchText || null,
        pagina: this.pagina,
        porPagina: this.porPagina,
      })
      .subscribe({
        next: (data) => {
          this.items = data.items;
          this.total = data.total;
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  onFilterChange(): void {
    this.pagina = 1;
    this.load();
  }

  limpiarFiltros(): void {
    this.proyectoId = null;
    this.estado = null;
    this.partida = null;
    this.searchText = '';
    this.onFilterChange();
  }

  changePage(page: number): void {
    this.pagina = page;
    this.load();
  }

  estadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Completado': return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
      case 'En Proceso': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      default: return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    }
  }

  fotoObservacion(o: ObservacionListItemDTO): string | null {
    return o.fotos.find((f) => f.tipo === 'Observacion')?.url ?? null;
  }

  fotosLevantamiento(o: ObservacionListItemDTO): number {
    return o.fotos.filter((f) => f.tipo === 'Levantamiento').length;
  }

  abrirLevantar(o: ObservacionListItemDTO): void {
    this.observacionParaLevantar = o;
    this.showLevantarModal = true;
  }

  onNuevaGuardada(): void {
    this.showNuevaModal = false;
    this.pagina = 1;
    this.load();
  }

  onLevantadaGuardada(): void {
    this.showLevantarModal = false;
    this.observacionParaLevantar = null;
    this.load();
  }

  trackById(_: number, o: ObservacionListItemDTO): number {
    return o.id;
  }
}
