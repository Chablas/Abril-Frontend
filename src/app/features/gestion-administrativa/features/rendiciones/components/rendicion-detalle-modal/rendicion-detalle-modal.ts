import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RendicionesService } from '../../services/rendiciones.service';
import { CorreoDestinatariosDto, RendicionDetalleDto } from '../../dtos/rendicion.dto';
import { avisosDe } from '../../../../shared/correo-aviso';
import { confirmarConCorreos } from '../../../../shared/confirmar-correos';
import { ConsolidadoS10Modal } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { SalidaCapturasModal } from '../../../../shared/components/salida-capturas-modal/salida-capturas-modal';
import { primeraRevisionColors, reembolsoColors } from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * Detalle de una planilla: sus documentos, el estado de la primera revisión y del reembolso, y las
 * salidas propias que agrupa. Trae también las acciones de la pantalla (adjuntar el Consolidado
 * del S10, avisar al revisor y corregir las capturas al subsanar) porque los correos del flujo
 * abren directo acá.
 */
@Component({
  standalone: true,
  selector: 'app-rendicion-detalle-modal',
  imports: [
    CommonModule, BaseModal, StatusBadge, TitleCasePipe, ConsolidadoS10Modal, SalidaCapturasModal,
  ],
  templateUrl: './rendicion-detalle-modal.html',
})
export class RendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /**
   * true = se abrió para subsanar una rendición observada: cada salida muestra su botón de
   * corregir capturas y montos. Lo decide la pantalla, que es la que conoce el estado de la fila.
   */
  @Input() subsanando = false;

  /**
   * A quién le llegan de verdad los dos correos que dispara este modal, ya resueltos con
   * Configuración → Correos. Los pasa la pantalla, que los trae con sus datos de arranque: son
   * los mismos para todas sus planillas (está acotada a un solo trabajador) y pedirlos otra vez
   * acá sería una petición de más por cada planilla que se abre.
   */
  @Input() correoPrimeraRevision: CorreoDestinatariosDto = { para: [], copia: [] };
  @Input() correoS10Revisor: CorreoDestinatariosDto = { para: [], copia: [] };

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: RendicionDetalleDto | null = null;
  consolidadoAbierto = false;

  /** id de la salida cuyo modal de capturas está abierto. null = cerrado. */
  capturasSolicitudId: number | null = null;

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

  readonly subirConsolidado = (file: File, montoTotal: number, numeroGuia: string) =>
    this.service.uploadConsolidadoS10(this.rendicionId, file, montoTotal, numeroGuia);

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

  // ── Enviar a primera revisión ────────────────────────────────────────

  /**
   * Manda la planilla a la primera revisión de la jefatura. Está acá además de en la tabla porque
   * el detalle es donde se ve lo que se está por mandar (montos, salidas y el PDF).
   */
  async enviarPrimeraRevision(): Promise<void> {
    const d = this.detalle;
    if (!d) return;

    const result = await confirmarConCorreos({
      titulo: '¿Enviar ' + d.codigo + ' a revisión?',
      avisos: avisosDe('Al revisor', this.correoPrimeraRevision),
      // Sin nadie a quien avisar el envío igual procede: la rendición pasa a revisión y el jefe la
      // ve en su bandeja. Es un aviso de estado, no un bloqueo.
      sinNadie: 'Pasa a revisión, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Sí, enviar',
    });
    if (!result.isConfirmed) return;

    this.loader.show();
    this.service.enviarPrimeraRevision(d.id).subscribe({
      next: (res) => {
        this.loader.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2400, showConfirmButton: false });
        // Se cierra: la planilla pasó a manos del jefe y ya no hay nada que hacerle desde acá.
        this.close.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Aviso al revisor ─────────────────────────────────────────────────

  async notificarRevisor(): Promise<void> {
    const d = this.detalle;
    if (!d) return;

    // A diferencia del envío a primera revisión, este aviso ES el correo: sin destinatarios el
    // backend responde 409, así que se corta acá y se dice por qué en vez de dejar intentarlo.
    if (this.correoS10Revisor.para.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nadie recibiría el aviso',
        text: 'El correo «S10 al revisor» está apagado o sin destinatarios en Configuración → Correos.',
        confirmButtonColor: '#0F6E56',
      });
      return;
    }

    const result = await confirmarConCorreos({
      titulo: d.revisorNotificadoAt ? '¿Volver a avisar?' : '¿Avisar al revisor?',
      // Solo cuando es una repetición: el resto del tiempo el título ya lo dice todo.
      nota: d.revisorNotificadoAt ? 'Ya le avisaste por esta planilla.' : undefined,
      avisos: avisosDe('Al revisor', this.correoS10Revisor),
      confirmButtonText: d.revisorNotificadoAt ? 'Sí, avisar de nuevo' : 'Sí, avisar',
    });
    if (!result.isConfirmed) return;

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

  // ── Volver a generar la planilla (subsanación) ───────────────────────

  /**
   * Vuelve a generar el PDF de la planilla con los montos ya corregidos. Vive también acá —y no
   * solo en la tabla— porque corregir las capturas se hace desde este modal: tener que cerrarlo
   * para dar el último paso era el hueco del flujo. La planilla conserva su código y queda lista
   * para reenviar a primera revisión.
   */
  async regenerarPlanilla(): Promise<void> {
    const d = this.detalle;
    if (!d) return;

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Volver a generar ' + d.codigo + '?',
      text: 'Queda lista para reenviar a revisión.',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!result.isConfirmed) return;

    this.loader.show();
    this.service.regenerarPlanilla(d.id).subscribe({
      next: (res) => {
        this.loader.hide();
        this.descargar(res, d.codigo + '.pdf');
        this.huboCambios = true;
        Swal.fire({
          icon: 'success',
          title: 'Planilla regenerada',
          text: d.codigo + ' quedó lista para enviar de nuevo a revisión.',
          timer: 2800,
          showConfirmButton: false,
        });
        // Se cierra: la planilla salió de "Observada" y lo que sigue —enviarla a revisión— es de
        // la tabla. Dejar el modal abierto mostrando un estado que ya cambió confunde más.
        this.close.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Dispara la descarga del PDF que devuelve el backend. */
  private descargar(response: HttpResponse<Blob>, filename: string): void {
    if (!response.body) return;
    const url = URL.createObjectURL(response.body);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Capturas de una salida (subsanación) ─────────────────────────────

  abrirCapturas(solicitudId: number): void {
    this.capturasSolicitudId = solicitudId;
    this.cdr.detectChanges();
  }

  /**
   * Al cerrar el modal de capturas se recarga el detalle si algo cambió: los montos de la tabla
   * salen de las capturas, así que quedarían desfasados. La planilla NO se regenera acá — eso es
   * un paso aparte de la pantalla, porque el PDF cubre la planilla entera.
   */
  cerrarCapturas(cambio: boolean): void {
    this.capturasSolicitudId = null;
    if (cambio) {
      this.huboCambios = true;
      this.cargar();
    } else {
      this.cdr.detectChanges();
    }
  }

  // ── Colores de estado ────────────────────────────────────────────────

  readonly primeraRevisionColors = primeraRevisionColors;

  // Los colores del estado del reembolso viven en el shared del módulo: el mismo estado tiene
  // que verse igual en las cinco pantallas del ciclo.
  readonly reembolsoColors = reembolsoColors;

  /** El badge dice "Observado" y no "Rechazado": lo que toca hacer es subsanar. */
  reembolsoTexto(estado: string): string {
    return estado === 'Rechazado' ? 'Observado' : estado;
  }
}
