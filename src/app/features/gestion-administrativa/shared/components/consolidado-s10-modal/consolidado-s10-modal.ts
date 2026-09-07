import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { FilePreview } from '../../../../../shared/components/file-preview/file-preview';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ConsolidadoS10Dto } from './consolidado-s10.dto';

/**
 * Adjunta el PDF "Consolidado del S10" de una planilla de rendición. Lo usan Mis Rendiciones (el
 * autoservicio, donde el trabajador lo sube) y Gestión de Rendiciones (el revisor, que puede
 * subirlo en su nombre); cada una le pasa su propia función de subida, que es lo único que cambia
 * entre ambas (endpoint + guard de propiedad en el backend).
 *
 * Ya no hay ámbito que elegir: el archivo cubre siempre la planilla completa, porque una planilla
 * es un registro en el S10.
 *
 * Además del PDF se capturan los dos datos con los que el S10 lo registró: el monto total y el
 * número de guía. El monto tiene que CUADRAR con el de la planilla —el consolidado la cubre
 * entera—, así que el formulario no deja adjuntar si no coincide; el backend lo re-valida.
 */
@Component({
  standalone: true,
  selector: 'app-consolidado-s10-modal',
  imports: [CommonModule, FormsModule, BaseModal, FileSelector, FilePreview],
  templateUrl: './consolidado-s10-modal.html',
  styleUrl: './consolidado-s10-modal.css',
})
export class ConsolidadoS10Modal implements OnDestroy {
  /** Función de subida que inyecta la pantalla anfitriona (ya sabe a qué endpoint pegarle). */
  @Input({ required: true }) upload!: (
    file: File, montoTotal: number, numeroGuia: string,
  ) => Observable<ConsolidadoS10Dto>;

  /**
   * Monto de la planilla COMPLETA — el que se registró en el S10. Es contra este que tiene que
   * cuadrar el monto declarado, y no contra lo que la pantalla muestre en su columna de monto:
   * esa está recortada a las salidas propias (o visibles) y una planilla puede agrupar a varias
   * personas.
   */
  @Input({ required: true }) montoEsperado!: number;

  /** Consolidado vigente, si la planilla ya tenía uno. Se muestra para abrirlo o reemplazarlo. */
  @Input() actual: ConsolidadoS10Dto | null = null;

  /** Referencia de la planilla ("TI: 000123") para que se vea a cuál se está adjuntando. */
  @Input() referencia: string | null = null;

  /** Emite al cerrar: el consolidado subido, o null si se cerró sin subir nada. */
  @Output() close = new EventEmitter<ConsolidadoS10Dto | null>();

  archivo: File | null = null;

  /**
   * Monto total declarado. Es null —no 0— mientras el campo esté vacío: el input numérico ya
   * entrega null, así que "sin escribir" y "escribió cero" no se confunden.
   */
  montoTotal: number | null = null;

  /** Número de guía del S10: texto libre, no un correlativo nuestro. */
  numeroGuia = '';

  constructor(
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  /** ObjectURL del archivo elegido, solo para poder revocarlo al salir. */
  private previewUrl: string | null = null;

  get archivoPreview(): { name: string; size: string }[] {
    if (!this.archivo) return [];
    return [{ name: this.archivo.name, size: this.formatSize(this.archivo.size) }];
  }

  onFileSelected(sel: SelectedFile): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = sel.preview;
    this.archivo = sel.file;
  }

  quitarArchivo(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.archivo = null;
  }

  cerrar(): void {
    this.close.emit(null);
  }

  // ── Monto y número de guía ─────────────────────────────────────────

  /** Los dos montos se comparan a 2 decimales, la precisión con la que se guarda el importe. */
  private static redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  /** True cuando ya hay un monto escrito y NO cuadra con el de la planilla. */
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
        && this.numeroGuia.trim().length > 0;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;

    this.loader.show();
    this.upload(this.archivo!, this.montoTotal!, this.numeroGuia.trim()).subscribe({
      next: (dto) => {
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: 'Consolidado del S10 adjuntado',
          timer: 1800,
          showConfirmButton: false,
        });
        this.close.emit(dto);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
