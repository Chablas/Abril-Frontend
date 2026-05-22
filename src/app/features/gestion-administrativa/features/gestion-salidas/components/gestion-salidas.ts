import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { GestionSalidasService } from '../services/gestion-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  GestionSalidaDetalleDto,
  GestionSalidaListItemDto,
} from '../dtos/gestion-salida.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { GestionSalidaDetalleModal } from './gestion-salida-detalle-modal/gestion-salida-detalle-modal';

@Component({
  standalone: true,
  selector: 'app-gestion-salidas',
  imports: [CommonModule, StatusBadge, SearchSelect, GestionSalidaDetalleModal],
  templateUrl: './gestion-salidas.html',
})
export class GestionSalidas implements OnInit {
  salidas: GestionSalidaListItemDto[] = [];

  trabajadorOptions: any[] = [];
  lugarProyectoOptions: any[] = [];
  readonly estadoRendicionOptions = [
    { value: null,           label: 'Todas' },
    { value: 'No rendido',   label: 'No rendidas' },
    { value: 'Rendido',      label: 'Rendidas' },
  ];

  filters = {
    workerId:         null as number | null,
    lugarProyectoId:  null as number | null,
    estadoRendicion:  null as string | null,
  };

  /** IDs seleccionados para acción bulk. */
  selectedIds = new Set<number>();

  /** Detalle abierto en modal (null = modal cerrado). */
  detalle: GestionSalidaDetalleDto | null = null;

  constructor(
    private service:       GestionSalidasService,
    private loaderService: LoaderService,
    private errorService:  ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.lugarProyectoOptions = [
          { gaLugarId: null, nombreDisplay: 'Todos los proyectos' },
          ...data.lugaresProyecto,
        ];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loaderService.show();
    this.selectedIds.clear();
    this.service.getAll(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
    ).subscribe({
      next: (data) => {
        this.salidas = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearch(): void {
    this.load();
  }

  exportarExcel(): void {
    this.loaderService.show();
    this.service.downloadExcel(
      this.filters.workerId,
      this.filters.lugarProyectoId,
      this.filters.estadoRendicion,
    ).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'Gestion_Salidas.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async aprobar(salida: GestionSalidaListItemDto): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Aprobar solicitud?',
      html: `Se aprobará la solicitud de <b>${salida.trabajador}</b>.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.aprobar(salida.id).subscribe({
      next: () => {
        salida.estadoAprobacion = 'Aprobado';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async rechazar(salida: GestionSalidaListItemDto): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Rechazar solicitud',
      html: `¿Rechazar la solicitud de <b>${salida.trabajador}</b>?`,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rechazar(salida.id).subscribe({
      next: () => {
        salida.estadoAprobacion = 'Rechazado';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Selección bulk para rendición ────────────────────────────────────

  /** Solo se pueden rendir Aprobadas + No rendidas + con TODOS los trayectos teniendo capturas. */
  esSeleccionable(s: GestionSalidaListItemDto): boolean {
    return s.estadoAprobacion === 'Aprobado'
      && s.estadoRendicion === 'No rendido'
      && s.puedeRendirse;
  }

  toggleSelection(s: GestionSalidaListItemDto): void {
    if (!this.esSeleccionable(s)) return;
    if (this.selectedIds.has(s.id)) this.selectedIds.delete(s.id);
    else                            this.selectedIds.add(s.id);
  }

  get seleccionables(): GestionSalidaListItemDto[] {
    return this.salidas.filter((s) => this.esSeleccionable(s));
  }

  get allSelected(): boolean {
    const seleccionables = this.seleccionables;
    return seleccionables.length > 0 && seleccionables.every((s) => this.selectedIds.has(s.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.seleccionables.map((s) => s.id));
    }
  }

  async marcarRendidasBulk(): Promise<void> {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: `¿Marcar ${ids.length} solicitud(es) como rendidas?`,
      text: 'Esto indica que ya fueron rendidas en el sistema S10.',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como rendidas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0086A5',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.marcarRendidasBulk(ids).subscribe({
      next: (response) => {
        // Disparar descarga del Excel devuelto
        const blob = response.body as Blob;
        const count = Number(response.headers.get('X-Rendidas-Count') ?? ids.length);
        const filename = this.extractFilename(response.headers.get('Content-Disposition'))
                      ?? `Planilla_Rendicion_${new Date().toISOString().slice(0, 10)}.pdf`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        this.loaderService.hide();
        Swal.fire({
          title: `${count} solicitud(es) marcada(s) como rendida(s)`,
          text: 'Se descargó la planilla de gasto por movilidad.',
          icon: 'success',
        });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    // Soporta filename="..." y filename*=UTF-8''...
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ── Modal de detalle ────────────────────────────────────────────────

  abrirDetalle(s: GestionSalidaListItemDto): void {
    this.loaderService.show();
    this.service.getDetalle(s.id).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  // ── Colores de badges ────────────────────────────────────────────────

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }
}
