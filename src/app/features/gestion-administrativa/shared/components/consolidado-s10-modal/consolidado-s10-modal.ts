import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
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
 * autoservicio, donde el trabajador lo sube) y Gestión de Salidas (el revisor, que puede subirlo
 * en su nombre); cada una le pasa su propia función de subida, que es lo único que cambia entre
 * ambas (endpoint + guard de propiedad en el backend).
 *
 * Ya no hay ámbito que elegir: el archivo cubre siempre la planilla completa, porque una planilla
 * es un registro en el S10.
 */
@Component({
  standalone: true,
  selector: 'app-consolidado-s10-modal',
  imports: [CommonModule, BaseModal, FileSelector, FilePreview],
  templateUrl: './consolidado-s10-modal.html',
  styleUrl: './consolidado-s10-modal.css',
})
export class ConsolidadoS10Modal implements OnDestroy {
  /** Función de subida que inyecta la pantalla anfitriona (ya sabe a qué endpoint pegarle). */
  @Input({ required: true }) upload!: (file: File) => Observable<ConsolidadoS10Dto>;

  /** Consolidado vigente, si la planilla ya tenía uno. Se muestra para abrirlo o reemplazarlo. */
  @Input() actual: ConsolidadoS10Dto | null = null;

  /** Referencia de la planilla ("TI: 000123") para que se vea a cuál se está adjuntando. */
  @Input() referencia: string | null = null;

  /** Emite al cerrar: el consolidado subido, o null si se cerró sin subir nada. */
  @Output() close = new EventEmitter<ConsolidadoS10Dto | null>();

  archivo: File | null = null;

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

  guardar(): void {
    if (!this.archivo) return;

    this.loader.show();
    this.upload(this.archivo).subscribe({
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
