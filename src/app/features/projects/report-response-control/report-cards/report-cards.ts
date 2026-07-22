import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';

/**
 * Vista tarjetas (presentacional) del control de respuesta de informes. Espejo de la
 * vista tabla: mismos datos (@Input) y mismas acciones de fila (@Output). El gating de
 * rol del botón/texto de respuesta es idéntico al de la tabla.
 */
@Component({
  selector: 'app-report-cards',
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './report-cards.html',
  styleUrl: './report-cards.css',
})
export class ReportCards {
  readonly Roles = Roles;

  @Input() data: ResidentReportIncidenceDTO[] = [];
  @Input() loading = false;

  @Output() respond = new EventEmitter<ResidentReportIncidenceDTO>();
  @Output() openView = new EventEmitter<ResidentReportIncidenceDTO>();

  /** Tarjetas fantasma para el skeleton de carga inicial (F8). */
  readonly skeletonCards = Array.from({ length: 6 });

  constructor(public authService: AuthService) {}

  onRespond(item: ResidentReportIncidenceDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.respond.emit(item);
  }
}
