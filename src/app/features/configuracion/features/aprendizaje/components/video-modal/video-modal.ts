import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../../../shared/components/file-preview/file-preview';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { EXTENSIONES_MANUAL } from '../../../../../../core/learning/learning.model';
import { AprendizajeAdminService } from '../../services/aprendizaje-admin.service';
import { LearningCategoryAdminDto, LearningVideoAdminDto } from '../../dtos/aprendizaje.dto';

/**
 * Manuales (PDF e imágenes) y los videos que reproduce Stream de SharePoint. El backend valida
 * los mismos.
 */
const EXTENSIONES = [
  ...EXTENSIONES_MANUAL,
  '.mp4', '.m4v', '.mov', '.webm', '.avi', '.wmv', '.mkv', '.mpg', '.mpeg',
];
const ARCHIVO_MAX_MB = 500;

/**
 * Alta/edición de un video o manual: un enlace (normalmente un video) o un archivo que el backend
 * sube a SharePoint (normalmente un manual). Al editar no se cambia de grupo (solo sus datos).
 */
@Component({
  standalone: true,
  selector: 'app-aprendizaje-video-modal',
  imports: [BaseModal, SearchSelect, FileSelector, FilePreview, CommonModule, FormsModule],
  templateUrl: './video-modal.html',
})
export class VideoModal implements OnInit {
  /** Video o manual a editar; null = alta. */
  @Input() video: LearningVideoAdminDto | null = null;
  /** Grupos disponibles (para elegir a cuál pertenece al crear). */
  @Input() categorias: LearningCategoryAdminDto[] = [];
  /** Grupo preseleccionado al crear (p. ej. el filtro activo de la tabla). */
  @Input() categoriaIdPreset: number | null = null;
  /** Nombre del grupo en edición (solo lectura; no se cambia de grupo al editar). */
  @Input() categoriaNombre = '';
  /** Superficie (LOGIN/INICIO) del grupo en edición. */
  @Input() categoriaSurfaceCode = '';

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly accept = EXTENSIONES.join(',');

  categoriaId: number | null = null;
  titulo = '';
  url = '';
  img = '';
  orden = 0;
  submitted = false;

  /** true = es un archivo en SharePoint; false = un enlace. */
  esArchivo = false;
  /** Archivo elegido en este modal (se sube al guardar). */
  archivo: File | null = null;
  /** Nombre del archivo que ya tiene el registro en edición; null si es enlace o se quitó. */
  archivoActual: string | null = null;

  constructor(
    private service: AprendizajeAdminService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.video) {
      this.titulo = this.video.titulo;
      this.img = this.video.img ?? '';
      this.orden = this.video.orden;
      this.archivoActual = this.video.archivoNombre ?? null;
      this.esArchivo = this.archivoActual != null;
      // En un archivo la url es el link que armó el backend al subirlo: no se ofrece como enlace.
      this.url = this.esArchivo ? '' : this.video.url;
    } else {
      this.categoriaId = this.categoriaIdPreset ?? this.categorias[0]?.id ?? null;
    }
    if (this.esLogin) this.esArchivo = false;
  }

  get esEdicion(): boolean {
    return this.video != null;
  }

  /** El login es público: un archivo de SharePoint no se abre sin cuenta de Abril, solo enlaces. */
  get esLogin(): boolean {
    const surfaceCode = this.esEdicion
      ? this.categoriaSurfaceCode
      : this.categorias.find((c) => c.id === this.categoriaId)?.surfaceCode;
    return surfaceCode === 'LOGIN';
  }

  onCategoriaChange(id: number | null): void {
    this.categoriaId = id;
    if (this.esLogin) this.esArchivo = false;
  }

  setEsArchivo(esArchivo: boolean): void {
    if (esArchivo && this.esLogin) return;
    this.esArchivo = esArchivo;
  }

  /** Tarjeta del archivo: el recién elegido o, si no hay, el que ya tenía. */
  get archivoPreview(): FilePreviewItem[] {
    if (this.archivo) {
      return [{ name: this.archivo.name, size: `${(this.archivo.size / 1024 / 1024).toFixed(2)} MB` }];
    }
    return this.archivoActual ? [{ name: this.archivoActual, size: 'Archivo actual' }] : [];
  }

  onArchivoSelected(selected: SelectedFile): void {
    // file-selector arma una vista previa por archivo que acá no se usa.
    URL.revokeObjectURL(selected.preview);

    const nombre = selected.file.name.toLowerCase();
    if (!EXTENSIONES.some((ext) => nombre.endsWith(ext))) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no permitido',
        text: 'Solo PDF, imágenes (JPG, PNG o WEBP) o videos (MP4, M4V, MOV, WEBM, AVI, WMV, MKV o MPG).',
      });
      return;
    }
    if (selected.file.size > ARCHIVO_MAX_MB * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo muy pesado',
        text: `El archivo no puede pasar de ${ARCHIVO_MAX_MB} MB.`,
      });
      return;
    }
    this.archivo = selected.file;
  }

  /** Quita el recién elegido (vuelve a verse el actual) o, si no hay, el actual. */
  quitarArchivo(): void {
    if (this.archivo) {
      this.archivo = null;
    } else {
      this.archivoActual = null;
    }
  }

  save(): void {
    this.submitted = true;
    if (!this.titulo.trim()) return;
    if (!this.esEdicion && this.categoriaId == null) return;
    if (this.esArchivo ? !this.archivoPreview.length : !this.url.trim()) return;

    const datos = {
      titulo: this.titulo.trim(),
      url: this.esArchivo ? '' : this.url.trim(),
      img: this.img.trim() || null,
      orden: this.orden ?? 0,
      esArchivo: this.esArchivo,
    };
    // Sin archivo nuevo en uno que ya era archivo, el backend conserva el actual.
    const archivo = this.esArchivo ? this.archivo : null;

    this.loaderService.show();
    const req$ = this.esEdicion
      ? this.service.editVideo(this.video!.id, datos, archivo)
      : this.service.createVideo({ categoriaId: this.categoriaId!, ...datos }, archivo);

    req$.subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success' });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        if (archivo) {
          this.errorSubida(err);
        } else {
          this.errorService.handleError(err);
        }
      },
    });
  }

  /**
   * Un archivo pesado puede chocar con los topes del proxy (nginx) antes de llegar al backend, y esas
   * respuestas no traen mensaje. El resto va al manejo estándar.
   */
  private errorSubida(err: HttpErrorResponse): void {
    if (err.status === 413) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo muy pesado',
        text: 'El servidor no acepta un archivo de este tamaño.',
      });
      return;
    }
    if (err.status === 504) {
      Swal.fire({
        icon: 'warning',
        title: 'La subida tardó demasiado',
        text: 'El archivo puede haberse guardado igual: recarga la lista antes de volver a intentarlo.',
      });
      return;
    }
    this.errorService.handleError(err);
  }
}
