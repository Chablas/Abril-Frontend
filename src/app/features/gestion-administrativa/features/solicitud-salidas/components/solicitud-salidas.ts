import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SolicitudSalidaCreate } from './create/create';
import { SolicitudSalidasService } from '../services/solicitud-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import { BtnNew } from '../../../../../shared/components/btn-new/btn-new';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SolicitudSalidaDetalleModal } from './solicitud-salida-detalle-modal/solicitud-salida-detalle-modal';
import { SolicitudSalidaCapturasModal } from './solicitud-salida-capturas-modal/solicitud-salida-capturas-modal';

@Component({
  standalone: true,
  selector: 'app-solicitud-salidas',
  imports: [CommonModule, DatePipe, SolicitudSalidaCreate, BtnNew, StatusBadge, SolicitudSalidaDetalleModal, SolicitudSalidaCapturasModal],
  templateUrl: './solicitud-salidas.html',
})
export class SolicitudSalidas implements OnInit {
  solicitudes: SolicitudSalidaListItemDto[] = [];
  showModal = false;

  /** ID de la solicitud cuyo modal de detalle (read-only) está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** ID de la solicitud cuyo modal de subir capturas está abierto. null = cerrado. */
  capturasId: number | null = null;

  constructor(
    private service: SolicitudSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getMySolicitudes().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
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
