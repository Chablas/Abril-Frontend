import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { CandidatoRevision, RevisionLongList } from '../../dtos/solicitud-personal.dto';

/**
 * Modal "Revisar long list y CVs" (vista del solicitante): lista los candidatos que GTH cargó
 * en la long list de un requerimiento, con su CV, experiencia, disponibilidad y fuente. El
 * solicitante los revisa para aprobar/rechazar y enviar su decisión a GTH.
 *
 * Por ahora es solo lectura: los botones Aprobar/Rechazar y "Enviar decisión de long list a GTH"
 * todavía no tienen funcionalidad (se implementará el flujo de decisión más adelante). Sí se puede
 * seleccionar un candidato para previsualizar su CV y sus datos.
 */
@Component({
  standalone: true,
  selector: 'app-gth-revision-long-list',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './revision-long-list.html',
})
export class GthRevisionLongList implements OnInit {
  /** Id del requerimiento cuya long list se revisa. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();

  revision: RevisionLongList | null = null;

  /** Candidato seleccionado para la vista previa del CV (por defecto, el primero). */
  seleccionado: CandidatoRevision | null = null;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getRevisionLongList(this.requerimientoId).subscribe({
      next: (data) => {
        this.revision = data;
        this.seleccionado = data.candidatos[0] ?? null;
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
    if (!this.revision) return '';
    const puesto = this.revision.puesto ? new TitleCasePipe().transform(this.revision.puesto) : '';
    return puesto ? `${this.revision.codigo} · ${puesto}` : this.revision.codigo;
  }

  /** Candidatos ya revisados (estado distinto de PENDIENTE). Hoy siempre 0 (decisión no implementada). */
  get revisados(): number {
    return this.revision?.candidatos.filter((c) => c.estadoCodigo !== 'PENDIENTE').length ?? 0;
  }

  get total(): number {
    return this.revision?.candidatos.length ?? 0;
  }

  seleccionar(c: CandidatoRevision): void {
    this.seleccionado = c;
  }

  /** Iniciales para el avatar del candidato (máx. 2 letras). */
  iniciales(nombre: string): string {
    const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + second).toUpperCase();
  }

  /** Experiencia formateada ("8 años" / "1 año" / "—"). */
  experienciaTexto(c: CandidatoRevision | null): string {
    if (!c || c.experienciaAnios == null) return '—';
    return `${c.experienciaAnios} ${c.experienciaAnios === 1 ? 'año' : 'años'}`;
  }

  /** Colores del badge del estado de revisión del candidato. */
  estadoColors(codigo: string): { bg: string; text: string } {
    switch (codigo) {
      case 'APROBADO':  return { bg: '#DCFCE7', text: '#15803D' };
      case 'RECHAZADO': return { bg: '#FEE2E2', text: '#B91C1C' };
      case 'PENDIENTE':
      default:          return { bg: '#F3F4F6', text: '#4B5563' };
    }
  }
}
