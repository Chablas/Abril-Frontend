import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SalidaDetalleService } from '../../services/salida-detalle.service';
import {
  SolicitudSalidaCapturaDto,
  SolicitudSalidaDetalleDto,
  TrayectoDetalleDto,
} from '../../dtos/salida-detalle.dto';

/** Una fila nueva (todavía sin subir): imagen + monto. */
interface PendienteRow {
  file: File | null;
  preview: string | null;
  monto: number | null;
}

/**
 * Una captura YA subida, con lo que el usuario tiene escrito encima. Lo guardado vive en
 * `captura` y lo editado al lado, así se puede comparar para saber si hay algo que guardar y la
 * fila original no se toca hasta que el backend confirma.
 */
interface CapturaFila {
  /** Lo que está guardado en la base (se repinta con lo que responde el backend al guardar). */
  captura: SolicitudSalidaCapturaDto;
  /** Monto en el input, siempre editable (no hay modo lectura). */
  monto: number | null;
  /** Imagen nueva elegida con "Reemplazar". null = se conserva la guardada. */
  file: File | null;
  /** ObjectURL de esa imagen nueva, para la miniatura y para poder revocarlo. */
  preview: string | null;
}

/**
 * Las capturas de movilidad de una salida, trayecto por trayecto: las que ya están cargadas —con
 * su monto y su imagen editables en el sitio— y las filas para agregar nuevas.
 *
 * Vive en el shared del módulo porque lo abren dos pantallas, en los dos momentos en que las
 * capturas se pueden tocar:
 *
 *  • Solicitud de Salidas — antes de rendir, para completar el sustento de cada trayecto. Ahí
 *    arranca con una fila nueva lista: lo que se espera es cargar capturas que todavía no hay.
 *  • Mis Rendiciones — al subsanar una rendición OBSERVADA en primera revisión, que es cuando el
 *    jefe pidió corregir capturas y montos. Ahí NO arranca con ninguna fila nueva: lo que se
 *    espera es corregir las que ya están, y una fila vacía de entrada solo estorbaba.
 *
 * El backend decide si se puede editar; el modo `subsanacion` solo cambia el texto y con qué
 * filas arranca.
 */
@Component({
  standalone: true,
  selector: 'app-salida-capturas-modal',
  imports: [CommonModule, FormsModule, BaseModal, DraggableImage],
  templateUrl: './salida-capturas-modal.html',
})
export class SalidaCapturasModal implements OnInit, OnDestroy {
  @Input({ required: true }) solicitudId!: number;

  /**
   * true = se abrió para subsanar una rendición observada. Cambia el título y el aviso —lo que se
   * espera no es "completar" el sustento sino corregir lo observado— y hace que no aparezca
   * ninguna fila nueva hasta que se pida con "Agregar otra captura".
   */
  @Input() subsanacion = false;

  /** Emite al cerrar: `true` si algo cambió (el padre debe recargar el listado). */
  @Output() close = new EventEmitter<boolean>();

  detalle: SolicitudSalidaDetalleDto | null = null;

  /**
   * True cuando se agregó, editó o quitó alguna captura en esta sesión del modal. Sirve para que
   * el padre recargue el listado (y con ello `puedeRendirse` y los montos) solo si algo cambió.
   */
  private algoCambio = false;

  /** Map trayectoId → capturas ya subidas de ese trayecto, con su edición al lado. */
  private capturasByTrayecto = new Map<number, CapturaFila[]>();

  /** Map trayectoId → filas nuevas (cada trayecto tiene su propio set de filas en edición). */
  pendientesByTrayecto = new Map<number, PendienteRow[]>();

  /** id de la captura que se está guardando o quitando, para bloquear sus botones. */
  guardandoCapturaId: number | null = null;

  constructor(
    private service: SalidaDetalleService,
    private loader: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.revocarPreviews();
  }

  private revocarPreviews(): void {
    this.pendientesByTrayecto.forEach((rows) =>
      rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); }),
    );
    this.capturasByTrayecto.forEach((filas) =>
      filas.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); }),
    );
  }

  get titulo(): string {
    return this.subsanacion ? 'Corregir capturas y montos' : 'Subir capturas de movilidad';
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.solicitudId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.revocarPreviews();

        data.trayectos.forEach((t) => {
          this.capturasByTrayecto.set(t.id, t.capturas.map((c) => this.filaDe(c)));
          // Antes de rendir se arranca con una fila lista para cargar; al subsanar, con ninguna
          // (las filas nuevas se piden con "Agregar otra captura").
          this.pendientesByTrayecto.set(t.id, this.subsanacion ? [] : [this.filaVacia()]);
        });

        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.algoCambio);
      },
    });
  }

  cerrar(): void {
    this.revocarPreviews();
    this.pendientesByTrayecto.clear();
    this.capturasByTrayecto.clear();
    this.close.emit(this.algoCambio);
  }

  private filaVacia(): PendienteRow {
    return { file: null, preview: null, monto: null };
  }

  private filaDe(c: SolicitudSalidaCapturaDto): CapturaFila {
    return { captura: c, monto: c.monto, file: null, preview: null };
  }

  // ── Capturas ya subidas: monto e imagen editables en el sitio ──────────

  capturasDe(trayectoId: number): CapturaFila[] {
    return this.capturasByTrayecto.get(trayectoId) ?? [];
  }

  /** Lo que se muestra en la miniatura: la imagen nueva si se eligió una, si no la guardada. */
  imagenDe(fila: CapturaFila): string {
    return fila.preview ?? fila.captura.imageUrl;
  }

  onReemplazarImagen(fila: CapturaFila, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // deja volver a elegir el mismo archivo
    if (!file) return;

    if (fila.preview) URL.revokeObjectURL(fila.preview);
    fila.file = file;
    fila.preview = URL.createObjectURL(file);
  }

  /** Descarta la imagen elegida y vuelve a mostrar la guardada. */
  descartarImagenNueva(fila: CapturaFila): void {
    if (fila.preview) URL.revokeObjectURL(fila.preview);
    fila.file = null;
    fila.preview = null;
  }

  /** True si hay algo distinto de lo guardado: otro monto, otra imagen, o las dos cosas. */
  hayCambios(fila: CapturaFila): boolean {
    return fila.file !== null || fila.monto !== fila.captura.monto;
  }

  puedeGuardarCaptura(fila: CapturaFila): boolean {
    return this.guardandoCapturaId === null
        && fila.monto !== null
        && fila.monto >= 0
        && this.hayCambios(fila);
  }

  /**
   * Guarda la fila: el monto y, si se eligió una, la imagen nueva. Se pinta sobre la captura que
   * ya está en pantalla con lo que responde el backend, así el total del trayecto y la miniatura
   * se actualizan sin recargar el detalle entero.
   */
  guardarCaptura(fila: CapturaFila): void {
    if (!this.puedeGuardarCaptura(fila)) return;

    this.guardandoCapturaId = fila.captura.id;
    this.service.actualizarCaptura(fila.captura.id, fila.monto as number, fila.file).subscribe({
      next: (actualizada) => {
        if (fila.preview) URL.revokeObjectURL(fila.preview);
        fila.captura = actualizada;
        fila.monto = actualizada.monto;
        fila.file = null;
        fila.preview = null;

        this.algoCambio = true;
        this.guardandoCapturaId = null;
        Swal.fire({
          icon: 'success',
          title: 'Captura actualizada',
          timer: 1400,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCapturaId = null;
        this.errorService.handleError(err);
      },
    });
  }

  async quitarCaptura(trayectoId: number, fila: CapturaFila): Promise<void> {
    if (this.guardandoCapturaId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Quitar esta captura?',
      text: `Dejará de contar los S/ ${fila.captura.monto.toFixed(2)} en la planilla.`,
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.guardandoCapturaId = fila.captura.id;
    this.service.eliminarCaptura(fila.captura.id).subscribe({
      next: () => {
        if (fila.preview) URL.revokeObjectURL(fila.preview);
        const filas = this.capturasDe(trayectoId).filter((f) => f !== fila);
        this.capturasByTrayecto.set(trayectoId, filas);
        this.algoCambio = true;
        this.guardandoCapturaId = null;
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCapturaId = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filas nuevas ───────────────────────────────────────────────────────

  pendientesDe(trayectoId: number): PendienteRow[] {
    return this.pendientesByTrayecto.get(trayectoId) ?? [];
  }

  agregarFila(trayectoId: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    rows.push(this.filaVacia());
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  eliminarFila(trayectoId: number, index: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    const removed = rows.splice(index, 1)[0];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    // Antes de rendir siempre queda una fila a mano (cargar capturas es el objetivo de esa
    // pantalla). Al subsanar se deja en cero: la fila vacía que no se podía cerrar era el ruido.
    if (rows.length === 0 && !this.subsanacion) rows.push(this.filaVacia());
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  onFileChange(trayectoId: number, index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    const row = rows[index];
    if (!row) return;
    if (row.preview) URL.revokeObjectURL(row.preview);
    row.file = file;
    row.preview = URL.createObjectURL(file);
    input.value = '';
  }

  filasValidasDe(trayectoId: number): PendienteRow[] {
    return this.pendientesDe(trayectoId).filter(
      (r) => r.file !== null && r.monto !== null && r.monto >= 0,
    );
  }

  puedeSubirTrayecto(trayectoId: number): boolean {
    const rows = this.pendientesDe(trayectoId);
    if (rows.length === 0) return false;
    // Todas las filas deben estar completas (file + monto), AL MENOS UNA debe estar lista para subir
    const completas = rows.filter((r) => r.file !== null && r.monto !== null && r.monto >= 0);
    return completas.length === rows.length;
  }

  /** Total del trayecto sobre los montos GUARDADOS: es lo que va a la planilla. */
  totalCapturasTrayecto(t: TrayectoDetalleDto): number {
    return this.capturasDe(t.id).reduce((acc, f) => acc + (f.captura.monto || 0), 0);
  }

  subirTrayecto(trayectoId: number): void {
    if (!this.puedeSubirTrayecto(trayectoId)) return;
    const rows = this.pendientesDe(trayectoId);
    const items = rows.map((r) => ({ file: r.file as File, monto: r.monto as number }));

    this.loader.show();
    this.service.uploadCapturasToTrayecto(trayectoId, items).subscribe({
      next: (creadas) => {
        this.algoCambio = true;
        // Las nuevas se suman a las que ya estaban, cada una con su edición lista.
        this.capturasByTrayecto.set(trayectoId, [
          ...this.capturasDe(trayectoId),
          ...creadas.map((c) => this.filaDe(c)),
        ]);

        // Reset filas de ese trayecto: al subsanar queda sin filas, antes de rendir con una lista.
        rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); });
        this.pendientesByTrayecto.set(trayectoId, this.subsanacion ? [] : [this.filaVacia()]);

        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: `${creadas.length} captura(s) subida(s)`,
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
