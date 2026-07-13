import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SolicitudSalidaCreate } from './create/create';
import { SolicitudSalidasService } from '../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SolicitudSalidaDetalleModal } from './solicitud-salida-detalle-modal/solicitud-salida-detalle-modal';
import { SolicitudSalidaCapturasModal } from './solicitud-salida-capturas-modal/solicitud-salida-capturas-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../shared/components/fab-button/fab-button';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';

@Component({
  standalone: true,
  selector: 'app-solicitud-salidas',
  imports: [CommonModule, DatePipe, SolicitudSalidaCreate, StatusBadge, SolicitudSalidaDetalleModal, SolicitudSalidaCapturasModal, SearchSelect, AbrilPageHeaderComponent, FabButton, TitleCasePipe, FilterTriggerButton, FilterModal],
  templateUrl: './solicitud-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class SolicitudSalidas implements OnInit {
  anioActual = new Date().getFullYear();
  solicitudes: SolicitudSalidaListItemDto[] = [];
  showModal = false;
  /** true cuando el formulario se abrió desde el atajo del boletín (?nuevo=1) → pantalla completa. */
  modalFullScreen = false;

  /** ID de la solicitud cuyo modal de detalle (read-only) está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** ID de la solicitud cuyo modal de subir capturas está abierto. null = cerrado. */
  capturasId: number | null = null;

  // ── Filtros ────────────────────────────────────────────────────────
  lugarProyectoOptions: any[] = [];
  readonly estadoAprobacionOptions = [
    { value: null,        label: 'Todas' },
    { value: 'Pendiente', label: 'Pendientes' },
    { value: 'Aprobado',  label: 'Aprobadas' },
    { value: 'Rechazado', label: 'Rechazadas' },
  ];
  readonly estadoRendicionOptions = [
    { value: null,         label: 'Todas' },
    { value: 'No rendido', label: 'No rendidas' },
    { value: 'Rendido',    label: 'Rendidas' },
  ];
  filters = {
    lugarProyectoId:  null as number | null,
    estadoAprobacion: null as string | null,
    estadoRendicion:  null as string | null,
  };

  /** Modal de filtros (mismo patrón que Gestión de Salidas). */
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.lugarProyectoId != null)  n++;
    if (this.filters.estadoAprobacion != null) n++;
    if (this.filters.estadoRendicion != null)  n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { lugarProyectoId: null, estadoAprobacion: null, estadoRendicion: null };
    this.onSearch();
  }

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
    // Atajo desde el boletín (?nuevo=1): abre el formulario directo, sin pasos extra.
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      this.showModal = true;
      this.modalFullScreen = true;
    }
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.lugarProyectoOptions = [
          { id: null, nombreDisplay: 'Todos los proyectos' },
          ...data.lugaresProyecto,
        ];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loaderService.show();
    this.service.getMySolicitudes(
      this.filters.lugarProyectoId,
      this.filters.estadoAprobacion,
      this.filters.estadoRendicion,
    ).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onSearch(): void {
    this.load();
  }

  onSaved(): void {
    this.showModal = false;
    this.load();
  }

  abrirDetalle(s: SolicitudSalidaListItemDto): void {
    this.detalleId = s.id;
  }

  cerrarDetalle(): void {
    this.detalleId = null;
  }

  /** Visible solo cuando la solicitud está Aprobada y aún no rendida. */
  puedeSubirCapturas(s: SolicitudSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado' && s.estadoRendicion !== 'Rendido';
  }

  abrirCapturas(s: SolicitudSalidaListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el modal de detalle
    this.capturasId = s.id;
  }

  cerrarCapturas(): void {
    this.capturasId = null;
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }
}
