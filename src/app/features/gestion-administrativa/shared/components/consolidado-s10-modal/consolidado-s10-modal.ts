import { CommonModule, formatDate, formatNumber } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../../shared/components/file-preview/file-preview';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ConsolidadoS10Dto, ConsolidadoS10UploadResultDto } from './consolidado-s10.dto';
import { CorreoAvisoDto } from '../../correo-aviso';
import { confirmarConCorreos, pedirAvisos } from '../../confirmar-correos';
import { NoWheelNumberDirective } from '../../../../../shared/directives/no-wheel-number.directive';
import { DocumentoEmbebido } from '../documento-embebido/documento-embebido';

/**
 * Adjunta el PDF "Consolidado del S10" de una o varias planillas de rendición. Lo sube el
 * consolidador: el primero desde Gestión de Rendiciones y el reemplazo desde Consolidados. Cada
 * anfitrión le pasa la función de subida (el endpoint y el control de quién puede consolidar viven
 * en el backend).
 *
 * El archivo cubre siempre planillas enteras: un registro en el S10 puede agrupar varias
 * rendiciones, incluso de trabajadores y razones sociales distintos. Queda bajo la razón social del
 * consolidador.
 *
 * Además del PDF se capturan los dos datos con los que el S10 lo registró: el monto total y el
 * número de reembolso. El monto tiene que CUADRAR con el de las planillas —el consolidado las cubre
 * enteras—, así que el formulario no deja adjuntar si no coincide; el backend lo re-valida.
 */
@Component({
  standalone: true,
  selector: 'app-consolidado-s10-modal',
  imports: [
    CommonModule, FormsModule, BaseModal, FileSelector, FilePreview, NoWheelNumberDirective,
    DocumentoEmbebido,
  ],
  templateUrl: './consolidado-s10-modal.html',
  styleUrl: './consolidado-s10-modal.css',
})
export class ConsolidadoS10Modal implements OnDestroy {
  /** Función de subida que inyecta la pantalla anfitriona (ya sabe a qué endpoint pegarle). */
  @Input({ required: true }) upload!: (
    file: File, montoTotal: number, numeroReembolso: string,
  ) => Observable<ConsolidadoS10UploadResultDto>;

  /**
   * Monto de las planillas COMPLETAS que va a cubrir —el que se registró en el S10—. Es contra este
   * que tiene que cuadrar el monto declarado, y no contra lo que la pantalla muestre en su columna de
   * monto: esa está recortada a las salidas propias (o visibles) y una planilla puede agrupar a
   * varias personas.
   */
  @Input({ required: true }) montoEsperado!: number;

  /**
   * Consolidado vigente, si ya había uno (el reemplazo, desde Consolidados). Se muestra solo como
   * enlace, debajo del campo del archivo nuevo: verlo embebido alargaba el modal con un papel que
   * se abre de un clic.
   */
  @Input() actual: ConsolidadoS10Dto | null = null;

  /** Referencia de la planilla ("TI: 000123") cuando es una sola, para ver a cuál se adjunta. */
  @Input() referencia: string | null = null;

  /**
   * Códigos de las planillas que va a cubrir cuando son VARIAS. Con una sola se deja vacío: basta
   * `referencia`.
   */
  @Input() rendiciones: string[] = [];

  /** Razón social del consolidador: bajo qué empresa queda el registro del S10. */
  @Input() razonSocial: string | null = null;

  /**
   * Código de la planilla grupal sobre la que se sube el consolidado (el primero, desde Gestión de
   * Rendiciones): es el papel que se registró en el S10. Sin valor al reemplazar, donde ya lo dice
   * el consolidado vigente.
   */
  @Input() codigoGrupal: string | null = null;

  /**
   * Preview de a quién le van a llegar los avisos de adjuntar, que la pantalla anfitriona sabe pedir
   * (es su endpoint): la jefatura y, al adjuntar el primero, los trabajadores de las rendiciones que
   * incluye. Se pide al confirmar y no al abrir: es una petición que solo hace falta si de verdad se
   * va a adjuntar.
   */
  @Input() avisosJefatura?: () => Observable<CorreoAvisoDto[]>;

  /** Emite al cerrar: el consolidado subido, o null si se cerró sin subir nada. */
  @Output() close = new EventEmitter<ConsolidadoS10Dto | null>();

  archivo: File | null = null;

  /**
   * Monto total declarado. Es null —no 0— mientras el campo esté vacío: el input numérico ya
   * entrega null, así que "sin escribir" y "escribió cero" no se confunden.
   */
  montoTotal: number | null = null;

  /** Número del reembolso del S10: texto libre, no un correlativo nuestro. */
  numeroReembolso = '';

  constructor(
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  /** True si el consolidado va a cubrir más de una planilla. */
  get varias(): boolean {
    return this.rendiciones.length > 1;
  }

  /** Lo que declara el consolidado ya adjunto, junto a su etiqueta: monto, reembolso y fecha. */
  get notaActual(): string | null {
    const a = this.actual;
    if (!a) return null;
    const partes: string[] = [];
    if (a.montoTotal !== null) partes.push(`S/ ${formatNumber(a.montoTotal, 'es-PE', '1.2-2')}`);
    if (a.numeroReembolso) partes.push(`N.° ${a.numeroReembolso}`);
    if (a.uploadedAt) partes.push(formatDate(a.uploadedAt, 'dd/MM/yyyy HH:mm', 'es-PE'));
    partes.push('subir otro lo reemplaza');
    return partes.join(' · ');
  }

  /** ObjectURL del archivo elegido, solo para poder revocarlo al salir. */
  private previewUrl: string | null = null;

  /**
   * Lo que muestra `app-file-preview`. Es un CAMPO y no un getter a propósito: un getter devuelve
   * un array nuevo en cada ciclo de detección de cambios, y su `*ngFor` entonces destruye y vuelve
   * a crear la tarjeta —con su botón «Quitar» dentro— entre el mousedown y el mouseup. El navegador
   * solo dispara `click` si los dos caen en el mismo elemento, así que el botón quedaba muerto.
   */
  archivoPreview: FilePreviewItem[] = [];

  onFileSelected(sel: SelectedFile): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = sel.preview;
    this.archivo = sel.file;
    this.archivoPreview = [{ name: sel.file.name, size: this.formatSize(sel.file.size) }];
  }

  quitarArchivo(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.archivo = null;
    this.archivoPreview = [];
  }

  cerrar(): void {
    this.close.emit(null);
  }

  // ── Monto y número de reembolso ─────────────────────────────────────────

  /** Los dos montos se comparan a 2 decimales, la precisión con la que se guarda el importe. */
  private static redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  /** True cuando ya hay un monto escrito y NO cuadra con el de las planillas. */
  get montoDescuadra(): boolean {
    if (this.montoTotal === null) return false;
    return ConsolidadoS10Modal.redondear(this.montoTotal)
        !== ConsolidadoS10Modal.redondear(this.montoEsperado ?? 0);
  }

  get puedeGuardar(): boolean {
    return !!this.archivo
        && this.montoTotal !== null
        && this.montoTotal > 0
        && !this.montoDescuadra
        && this.numeroReembolso.trim().length > 0;
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar) return;

    // Adjuntar dispara los avisos en el mismo paso (a la jefatura y, el primero, a los trabajadores),
    // así que la confirmación imprime a quién le van a llegar: es la misma regla que el resto de las
    // acciones del flujo.
    if (this.avisosJefatura) {
      const result = await confirmarConCorreos({
        titulo: this.actual ? '¿Reemplazar el Consolidado del S10?' : '¿Enviar el Consolidado del S10?',
        avisos: await pedirAvisos(this.avisosJefatura()),
        // Sin nadie a quien avisar igual procede: el consolidado queda adjunto y la jefatura lo ve
        // en su bandeja de Consolidados. Es un aviso de estado, no un bloqueo.
        sinNadie: 'El consolidado queda adjunto, pero sin aviso por correo: está apagado en Configuración → Correos.',
        confirmButtonText: this.actual ? 'Reemplazar y avisar' : 'Enviar y avisar',
      });
      if (!result.isConfirmed) return;
    }

    this.loader.show();
    this.upload(this.archivo!, this.montoTotal!, this.numeroReembolso.trim()).subscribe({
      next: (res) => {
        this.loader.hide();
        // El aviso a la jefatura sale solo en este mismo paso, pero es best-effort: si no salió, el
        // consolidado igual quedó adjunto y el mensaje dice por qué, en vez de anunciar una revisión
        // que nadie pidió.
        Swal.fire({
          icon: res.jefaturaAvisada ? 'success' : 'warning',
          title: this.actual ? 'Consolidado del S10 reemplazado' : 'Consolidado del S10 enviado',
          text: [this.resumenGrupal(res.consolidado), res.avisoJefatura]
            .filter(Boolean)
            .join(' '),
          // El caso "no salió el correo" se queda hasta que lo cierren: es lo que hay que leer,
          // porque la jefatura no se enteró y hay que avisarle desde Consolidados.
          ...(res.jefaturaAvisada ? { timer: 3200, showConfirmButton: false } : {}),
        });
        this.close.emit(res.consolidado);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * La rendición grupal que quedó armada, nombrada por su código: es con ese nombre que el
   * consolidador la va a encontrar después en Consolidados, en Correcciones S10 y en Reembolsos.
   * Vacío en los consolidados sin código (los anteriores a la columna).
   */
  private resumenGrupal(dto: ConsolidadoS10Dto): string {
    if (!dto.codigo) return '';
    return this.varias
      ? `${dto.codigo} agrupa ${this.rendiciones.length} rendiciones.`
      : `${dto.codigo} quedó registrado.`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
