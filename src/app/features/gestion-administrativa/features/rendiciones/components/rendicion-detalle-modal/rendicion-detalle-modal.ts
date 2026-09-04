import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RendicionesService } from '../../services/rendiciones.service';
import { RendicionDetalleDto } from '../../dtos/rendicion.dto';
import { ConsolidadoS10Modal } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

/**
 * Detalle de una planilla: sus documentos, el estado del reembolso y las salidas propias que
 * agrupa. Trae también las dos acciones de la pantalla (adjuntar el Consolidado del S10 y avisar
 * al revisor) porque los correos del reembolso abren directo acá.
 */
@Component({
  standalone: true,
  selector: 'app-rendicion-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe, ConsolidadoS10Modal],
  templateUrl: './rendicion-detalle-modal.html',
})
export class RendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: RendicionDetalleDto | null = null;
  consolidadoAbierto = false;

  /** Se enciende con la primera acción para avisarle al padre que su tabla quedó desfasada. */
  private huboCambios = false;

  constructor(
    private service: RendicionesService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.rendicionId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.huboCambios);
      },
    });
  }

  cerrar(): void {
    this.close.emit(this.huboCambios);
  }

  // ── Consolidado del S10 ──────────────────────────────────────────────

  readonly subirConsolidado = (file: File) =>
    this.service.uploadConsolidadoS10(this.rendicionId, file);

  get consolidadoReferencia(): string | null {
    const d = this.detalle;
    if (!d) return null;
    return d.numeroPlanilla ?? `Rendición del ${new Date(d.rendidoAt).toLocaleDateString('es-PE')}`;
  }

  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoAbierto = false;
    if (subido) {
      this.huboCambios = true;
      this.cargar();
    } else {
      this.cdr.detectChanges();
    }
  }

  // ── Aviso al revisor ─────────────────────────────────────────────────

  async notificarRevisor(): Promise<void> {
    const d = this.detalle;
    if (!d) return;

    if (d.revisorNotificadoAt) {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Volver a avisar?',
        text: 'Ya le avisaste a tu revisor por esta planilla. Se le enviará el correo otra vez.',
        showCancelButton: true,
        confirmButtonText: 'Sí, avisar de nuevo',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F6E56',
      });
      if (!result.isConfirmed) return;
    }

    this.loader.show();
    this.service.notificarRevisor(d.id).subscribe({
      next: (res) => {
        this.loader.hide();
        this.huboCambios = true;
        Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Colores de estado ────────────────────────────────────────────────

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  /** El badge dice "Observado" y no "Rechazado": lo que toca hacer es subsanar. */
  reembolsoTexto(estado: string): string {
    return estado === 'Rechazado' ? 'Observado' : estado;
  }
}
