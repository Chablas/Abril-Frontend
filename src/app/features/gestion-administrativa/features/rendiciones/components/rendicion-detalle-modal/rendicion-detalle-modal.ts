import { CommonModule, formatDate } from '@angular/common';
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
import { CorreoAvisoDto } from '../../../../shared/correo-aviso';
import { confirmarConCorreos } from '../../../../shared/confirmar-correos';
import {
  ConsolidadoS10Dto,
  otrasRendicionesDelConsolidado,
} from '../../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { SalidaCapturasModal } from '../salida-capturas-modal/salida-capturas-modal';
import { SalidaDetalleModal } from '../../../../shared/components/salida-detalle-modal/salida-detalle-modal';
import { DocumentoEmbebido } from '../../../../shared/components/documento-embebido/documento-embebido';
import { ReembolsoPipeline } from '../../../../shared/components/reembolso-pipeline/reembolso-pipeline';
import {
  primeraRevisionColors,
  reembolsoColors,
} from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * Detalle de una planilla: sus documentos, el estado de la primera revisión y del reembolso, y las
 * salidas propias que agrupa, cada una con su ojo para ver trayectos, capturas y montos. Trae
 * también las acciones del trabajador (enviar a primera revisión y corregir las capturas al
 * subsanar) porque los correos de la primera revisión abren directo acá.
 * El Consolidado del S10 se ve pero no se toca: lo adjunta el consolidador de su área.
 */
@Component({
  standalone: true,
  selector: 'app-rendicion-detalle-modal',
  imports: [
    CommonModule, BaseModal, StatusBadge, TitleCasePipe, SalidaCapturasModal, SalidaDetalleModal,
    DocumentoEmbebido, ReembolsoPipeline,
  ],
  templateUrl: './rendicion-detalle-modal.html',
})
export class RendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /**
   * A quién le llegan de verdad los correos que dispara este modal, ya resueltos con Configuración
   * → Correos. Los pasa la pantalla, que los trae con sus datos de arranque: son los mismos para
   * todas sus planillas (está acotada a un solo trabajador) y pedirlos otra vez acá sería una
   * petición de más por cada planilla que se abre.
   */
  @Input() correosEnvioRevision: CorreoAvisoDto[] = [];

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: RendicionDetalleDto | null = null;

  /** id de la salida cuyo modal de capturas está abierto. null = cerrado. */
  capturasSolicitudId: number | null = null;

  /** Salida cuyo detalle (el ojo de la tabla) está abierto. null = cerrado. */
  salidaId: number | null = null;

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

  /**
   * true = la planilla está observada en primera revisión, así que toca subsanarla: cada salida
   * muestra su botón de corregir capturas y montos y al pie aparece "Volver a generar".
   *
   * Sale del detalle que carga este mismo modal y NO de un input de la pantalla. Cuando lo pasaba
   * la fila, el modal salía completo al clickear la tabla pero recortado al entrar por el enlace
   * del correo ("Resolver la observación", `?rendicion=N`), que abre el modal sin pasar por la
   * fila: el trabajador llegaba desde el correo a subsanar y no encontraba ni "Corregir" ni
   * "Volver a generar". Derivándolo del detalle, todas las puertas de entrada muestran lo mismo.
   */
  get subsanando(): boolean {
    return this.detalle?.puedeSubsanar === true;
  }

  // ── Consolidado del S10 (solo lectura) ───────────────────────────────

  /** Con qué otras rendiciones comparte el Consolidado del S10 (vacío si es solo suyo). */
  otrasDelConsolidado(d: { id: number; consolidadoS10: ConsolidadoS10Dto | null }): string[] {
    return otrasRendicionesDelConsolidado(d.consolidadoS10, d.id);
  }

  /**
   * Nota al lado de la etiqueta del Consolidado del S10: cuándo se firmó —solo en la copia
   * firmada— y con qué otras planillas comparte el documento.
   *
   * Se arma acá porque de las dos copias se muestra una sola: cuando llega la firma, la original
   * desaparece, y con ella desaparecía el «También cubre» que era su única nota.
   */
  notaConsolidado(d: RendicionDetalleDto, firmado: boolean): string | null {
    const partes: string[] = [];
    const firmadoAt = d.consolidadoS10?.firmadoAt;
    if (firmado && firmadoAt) {
      partes.push('Firmado el ' + formatDate(firmadoAt, 'dd/MM/yyyy', 'es-PE'));
    }
    const otras = this.otrasDelConsolidado(d);
    if (otras.length) partes.push('También cubre ' + otras.join(', '));
    return partes.length ? partes.join(' · ') : null;
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
      avisos: this.correosEnvioRevision,
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

  // ── Volver a generar la planilla (subsanación) ───────────────────────

  /**
   * Vuelve a generar el PDF de la planilla con los montos ya corregidos y la reenvía a la primera
   * revisión en el mismo paso: una planilla se subsana justamente para que el jefe la vuelva a
   * mirar, y el envío aparte se quedaba sin dar. Vive también acá —y no solo en la tabla— porque
   * corregir las capturas se hace desde este modal. La planilla conserva su código.
   *
   * El PDF nuevo no se descarga: queda guardado y la planilla ya apunta a él, así que se ve con el
   * botón «Planilla» de la fila. Bajarlo sin que nadie lo pida era ruido en cada subsanación.
   *
   * Por eso la confirmación imprime los destinatarios: es la misma acción que antes disparaba
   * "Enviar a revisión", así que tiene que decir a quién le va a llegar.
   */
  async regenerarPlanilla(): Promise<void> {
    const d = this.detalle;
    if (!d) return;

    const result = await confirmarConCorreos({
      titulo: '¿Volver a generar ' + d.codigo + '?',
      avisos: this.correosEnvioRevision,
      // Sin nadie a quien avisar igual procede: la planilla se regenera y pasa a revisión, y el
      // jefe la ve en su bandeja. Es un aviso de estado, no un bloqueo.
      sinNadie: 'Se regenera y pasa a revisión, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Generar y avisar al revisor',
    });
    if (!result.isConfirmed) return;

    this.loader.show();
    this.service.regenerarPlanilla(d.id).subscribe({
      next: (res) => {
        this.loader.hide();
        this.huboCambios = true;
        // El reenvío es best-effort en el backend: si el correo no salió, el aviso lo dice en vez
        // de anunciar una revisión que nadie pidió.
        Swal.fire({
          icon: res.enviadaARevision ? 'success' : 'warning',
          title: 'Planilla regenerada',
          text: res.message || d.codigo + ' se volvió a generar y se envió a revisión.',
          // El caso "no salió el correo" se queda hasta que lo cierren: es lo que hay que leer.
          ...(res.enviadaARevision ? { timer: 2800, showConfirmButton: false } : {}),
        });
        // Se cierra: la planilla salió de "Observada" y ya está en manos del jefe. Dejar el modal
        // abierto mostrando un estado que ya cambió confunde más.
        this.close.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
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

  // ── Detalle de una salida ────────────────────────────────────────────

  /**
   * Abre el detalle de la salida en el modo del propio trabajador (sin `[cargar]`): es el mismo
   * endpoint de Solicitud de Salidas, que ya la acota al usuario autenticado. Toda salida de una
   * planilla está rendida, así que el modal no ofrece editar, rendir ni cancelar.
   */
  verSalida(solicitudId: number): void {
    this.salidaId = solicitudId;
  }

  cerrarSalida(): void {
    this.salidaId = null;
    this.cdr.detectChanges();
  }

  // ── Colores de estado ────────────────────────────────────────────────

  readonly primeraRevisionColors = primeraRevisionColors;

  // Los colores del estado del reembolso viven en el shared del módulo: el mismo estado tiene
  // que verse igual en las cinco pantallas del ciclo.
  readonly reembolsoColors = reembolsoColors;

  /** El estado ya se llama "Observado" en el backend: el badge lo imprime tal cual. */
  reembolsoTexto(estado: string): string {
    return estado;
  }
}
