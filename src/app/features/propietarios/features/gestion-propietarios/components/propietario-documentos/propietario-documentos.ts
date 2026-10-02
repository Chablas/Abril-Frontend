import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GestionPropietariosService } from '../../services/gestion-propietarios.service';
import { PropietarioListItemDto } from '../../dtos/propietario.dto';
import {
  PropiedadDocumentosDto,
  PropietarioDocumentoDto,
  PropietarioDocumentosDto,
} from '../../dtos/propietario-documento.dto';

interface FilaNueva {
  key: number;
  propietarioId: number;
  tipoId: number | null;
  nombre: string;
  archivo: File | null;
}

/** Mismos topes que el backend (PropietarioDocumentoStorage). */
const EXTENSIONES = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_POR_GUARDADO = 10;

/**
 * Documentos de un propietario, por propiedad: lo que ve en «Mis documentos» de la app. Los
 * nuevos se juntan y se mandan con un solo Guardar; eliminar uno ya guardado es inmediato.
 */
@Component({
  standalone: true,
  selector: 'app-propietario-documentos',
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, TitleCasePipe, AbrilBulkActionDirective],
  templateUrl: './propietario-documentos.html',
})
export class PropietarioDocumentos implements OnInit {
  @Input({ required: true }) propietario!: PropietarioListItemDto;
  @Output() closeModal = new EventEmitter<void>();

  @ViewChild(BaseModal) private baseModal?: BaseModal;

  readonly accept = EXTENSIONES.join(',');

  modal: PropietarioDocumentosDto | null = null;
  /** Por propiedad, siempre el mismo arreglo: el *ngFor no recrea las filas en cada ciclo. */
  nuevosPorPropiedad = new Map<number, FilaNueva[]>();
  submitted = false;

  private siguienteKey = 1;

  constructor(
    private service: GestionPropietariosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDocumentos(this.propietario.personId).subscribe({
      next: (res) => {
        this.pintar(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get nuevos(): FilaNueva[] {
    return [...this.nuevosPorPropiedad.values()].flat();
  }

  get hayNuevos(): boolean {
    return this.nuevos.length > 0;
  }

  agregar(propiedad: PropiedadDocumentosDto): void {
    if (this.nuevos.length >= MAX_POR_GUARDADO) {
      Swal.fire({ icon: 'warning', title: `Se guardan hasta ${MAX_POR_GUARDADO} documentos a la vez` });
      return;
    }
    this.nuevosPorPropiedad.get(propiedad.propietarioId)?.push({
      key: this.siguienteKey++,
      propietarioId: propiedad.propietarioId,
      tipoId: null,
      nombre: '',
      archivo: null,
    });
  }

  quitar(propiedad: PropiedadDocumentosDto, fila: FilaNueva): void {
    const filas = this.nuevosPorPropiedad.get(propiedad.propietarioId);
    if (!filas) return;
    filas.splice(filas.indexOf(fila), 1);
  }

  onArchivo(fila: FilaNueva, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    const ext = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();
    if (!EXTENSIONES.includes(ext)) {
      Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: `${archivo.name}: solo PDF, JPG o PNG.` });
      return;
    }
    if (archivo.size > MAX_BYTES) {
      Swal.fire({ icon: 'warning', title: 'Archivo muy pesado', text: `${archivo.name} pesa más de 25 MB.` });
      return;
    }

    fila.archivo = archivo;
    // El nombre del archivo como punto de partida: casi siempre ya dice qué es.
    if (!fila.nombre.trim()) fila.nombre = archivo.name.slice(0, archivo.name.lastIndexOf('.')).slice(0, 150);
  }

  filaCompleta(fila: FilaNueva): boolean {
    return fila.tipoId != null && fila.nombre.trim().length > 0 && fila.archivo != null;
  }

  guardar(): void {
    const nuevos = this.nuevos;
    if (nuevos.length === 0) return;

    this.submitted = true;
    if (!nuevos.every((f) => this.filaCompleta(f))) return;

    this.loaderService.show();
    this.service
      .guardarDocumentos(
        this.propietario.personId,
        nuevos.map((f) => ({ propietarioId: f.propietarioId, tipoId: f.tipoId!, nombre: f.nombre.trim() })),
        nuevos.map((f) => f.archivo!),
      )
      .subscribe({
        next: (res) => {
          this.nuevosPorPropiedad.clear();
          this.submitted = false;
          this.pintar(res);
          if (this.baseModal) this.baseModal.dirty = false;
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: nuevos.length === 1 ? 'Documento guardado' : 'Documentos guardados',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  eliminar(documento: PropietarioDocumentoDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar documento',
      text: `«${documento.nombre}» deja de verse en la app.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#D30000',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;

      this.loaderService.show();
      this.service.eliminarDocumento(this.propietario.personId, documento.documentoId).subscribe({
        next: (res) => {
          this.pintar(res);
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  descargar(documento: PropietarioDocumentoDto): void {
    this.loaderService.show();
    this.service.descargarDocumento(this.propietario.personId, documento.documentoId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = documento.archivoNombre;
        link.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: async (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(await this.errorConMensaje(err));
      },
    });
  }

  ubicacion(propiedad: PropiedadDocumentosDto): string {
    return [propiedad.torre ? `Torre ${propiedad.torre}` : null, `Dpto. ${propiedad.departamento}`]
      .filter(Boolean)
      .join(' · ');
  }

  tamano(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toLocaleString('es-PE', { maximumFractionDigits: 1 })} MB`;
  }

  trackPropiedad(_: number, propiedad: PropiedadDocumentosDto): number {
    return propiedad.propietarioId;
  }

  trackDocumento(_: number, documento: PropietarioDocumentoDto): number {
    return documento.documentoId;
  }

  trackFila(_: number, fila: FilaNueva): number {
    return fila.key;
  }

  /** Repinta con lo que devolvió el backend, sin perder las filas nuevas que sigan teniendo propiedad. */
  private pintar(res: PropietarioDocumentosDto): void {
    this.modal = res;
    const vigentes = new Set(res.propiedades.map((p) => p.propietarioId));
    for (const id of [...this.nuevosPorPropiedad.keys()]) {
      if (!vigentes.has(id)) this.nuevosPorPropiedad.delete(id);
    }
    for (const id of vigentes) {
      if (!this.nuevosPorPropiedad.has(id)) this.nuevosPorPropiedad.set(id, []);
    }
  }

  /** Con responseType 'blob' el error también llega como Blob: se lee para mostrar el mensaje del backend. */
  private async errorConMensaje(err: HttpErrorResponse): Promise<HttpErrorResponse> {
    if (!(err.error instanceof Blob)) return err;
    try {
      return new HttpErrorResponse({
        error: JSON.parse(await err.error.text()),
        status: err.status,
        statusText: err.statusText,
        url: err.url ?? undefined,
      });
    } catch {
      return err;
    }
  }
}
