import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { AbrilModalPanel } from '../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { DraggableImage } from '../../../../shared/components/draggable-image/draggable-image';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { RevisionDescansoAdjuntoDto, RevisionDescansoDetalleDto } from './revision-descansos.dtos';

@Component({
  standalone: true,
  selector: 'app-revision-descanso-detalle-modal',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, DraggableImage, TitleCasePipe],
  templateUrl: './revision-descanso-detalle-modal.component.html',
  styleUrl: './revision-descanso-detalle-modal.component.css',
})
export class RevisionDescansoDetalleModalComponent {
  @Input({ required: true }) detalle!: RevisionDescansoDetalleDto;
  @Output() close = new EventEmitter<void>();
  @Output() aprobar = new EventEmitter<number>();
  @Output() rechazar = new EventEmitter<number>();

  readonly apiUrl = environment.apiUrl;

  cerrar(): void {
    this.close.emit();
  }

  /** True si el adjunto es una imagen (se muestra expandible con zoom en vez de link). */
  esImagen(a: RevisionDescansoAdjuntoDto): boolean {
    const ref = (a.nombre || a.url).split('?')[0];
    return /\.(jpe?g|png|gif|webp|bmp)$/i.test(ref);
  }

  get adjuntosImagen(): RevisionDescansoAdjuntoDto[] {
    return this.detalle.adjuntos.filter((a) => this.esImagen(a));
  }

  get adjuntosArchivo(): RevisionDescansoAdjuntoDto[] {
    return this.detalle.adjuntos.filter((a) => !this.esImagen(a));
  }

  estadoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':   return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado':  return { bg: '#FAD5D4', text: '#D30000' };
      case 'Completado': return { bg: '#DBEAFE', text: '#2563EB' };
      default:           return { bg: '#FEF9C3', text: '#92400E' };
    }
  }
}
