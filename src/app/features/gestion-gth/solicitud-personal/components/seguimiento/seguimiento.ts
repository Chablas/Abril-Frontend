import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { Seguimiento } from '../../dtos/solicitud-personal.dto';

/**
 * Modal "Estado del reclutamiento" (solo lectura): cabecera con datos clave del
 * requerimiento + línea de tiempo vertical de las fases del pipeline. Se abre desde
 * el botón "Hacer seguimiento" de la tabla "Mis solicitudes de vacante".
 */
@Component({
  standalone: true,
  selector: 'app-gth-seguimiento',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './seguimiento.html',
})
export class GthSeguimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();

  seguimiento: Seguimiento | null = null;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getSeguimiento(this.requerimientoId).subscribe({
      next: (data) => {
        this.seguimiento = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.seguimiento) return '';
    const puesto = this.titleCase(this.seguimiento.puesto);
    return puesto ? `${this.seguimiento.codigo} · ${puesto}` : this.seguimiento.codigo;
  }

  /**
   * Etiqueta de la tarjeta "Aprobación GG": la decisión sobre ESTA vacante si ya la hay, o el
   * estado de la solicitud completa mientras siga pendiente.
   */
  get aprobacionGgLabel(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return 'No requerida';
    if (ap.aprobado === true) return 'Aprobada';
    if (ap.aprobado === false) return 'Rechazada';
    return ap.enviadoEn ? 'Pendiente' : 'Correo sin enviar';
  }

  /** Color de la etiqueta de "Aprobación GG" (verde aprobada, rojo rechazada, ámbar pendiente). */
  get aprobacionGgColor(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return '#6B7280';
    if (ap.aprobado === true) return '#15803D';
    if (ap.aprobado === false) return '#B91C1C';
    return '#B45309';
  }

  /** Detalle bajo la etiqueta: cuándo se decidió, o a qué está esperando. */
  get aprobacionGgDetalle(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return 'Registrada antes de este paso del flujo';
    if (ap.decididoEn) return `Gerencia General · ${this.fecha(ap.decididoEn)}`;
    return ap.enviadoEn
      ? `Enviada a Gerencia General el ${this.fecha(ap.enviadoEn)}`
      : 'No se pudo enviar el correo; usa «Reenviar a Gerencia General»';
  }

  /** Comentario que dejó Gerencia General al decidir (si hay). */
  get aprobacionGgComentario(): string | null {
    return this.seguimiento?.aprobacionGg?.comentario ?? null;
  }

  private fecha(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
  }

  private titleCase(value: string | null | undefined): string {
    return value ? new TitleCasePipe().transform(value) : '';
  }
}
