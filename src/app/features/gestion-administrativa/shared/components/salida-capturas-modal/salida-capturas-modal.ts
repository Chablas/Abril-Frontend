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
 * Todo se guarda con UN solo botón al pie: el modal arma el sustento completo de la salida y lo
 * manda en una sola llamada (una sola resolución de la carpeta de SharePoint y un solo
 * SaveChanges), en vez de persistir fila por fila. La única excepción es quitar una captura, que
 * es destructivo, se confirma aparte y por eso se aplica al toque.
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

  /** True mientras se está guardando el lote o quitando una captura: bloquea toda la edición. */
  guardando = false;

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
        this.aplicarDetalle(data);
        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.algoCambio);
      },
    });
  }

  /** Repinta el modal con el detalle que devolvió el backend y deja la edición en cero. */
  private aplicarDetalle(data: SolicitudSalidaDetalleDto): void {
    this.detalle = data;
    this.revocarPreviews();

    data.trayectos.forEach((t) => {
      this.capturasByTrayecto.set(t.id, t.capturas.map((c) => this.filaDe(c)));
      // Antes de rendir se arranca con una fila lista para cargar; al subsanar, con ninguna
      // (las filas nuevas se piden con "Agregar otra captura").
      this.pendientesByTrayecto.set(t.id, this.subsanacion ? [] : [this.filaVacia()]);
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

  /**
   * Quitar una captura sí se aplica al toque: es destructivo, ya se confirma con su propio aviso
   * y dejarlo pendiente del botón del pie obligaría a poder deshacerlo.
   */
  async quitarCaptura(trayectoId: number, fila: CapturaFila): Promise<void> {
    if (this.guardando) return;

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

    this.guardando = true;
    this.service.eliminarCaptura(fila.captura.id).subscribe({
      next: () => {
        if (fila.preview) URL.revokeObjectURL(fila.preview);
        const filas = this.capturasDe(trayectoId).filter((f) => f !== fila);
        this.capturasByTrayecto.set(trayectoId, filas);
        this.algoCambio = true;
        this.guardando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
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

  /** Total del trayecto sobre los montos GUARDADOS: es lo que va a la planilla. */
  totalCapturasTrayecto(t: TrayectoDetalleDto): number {
    return this.capturasDe(t.id).reduce((acc, f) => acc + (f.captura.monto || 0), 0);
  }

  // ── Tope de movilidad por trayecto ─────────────────────────────────────
  // El tope es de CADA trayecto, no del día ni de la solicitud: varios trayectos pueden sumar
  // más que el tope entre todos y eso está permitido — lo que un día no aguanta se reparte al
  // imprimir la planilla, donde el trayecto que desborda sale con la fecha del día siguiente.
  // El backend rehace la misma cuenta al guardar; esto es la ayuda, no el control.

  /** Tope en soles de cada trayecto. */
  get limiteTrayecto(): number {
    return this.detalle?.limiteMovilidadTrayecto ?? 0;
  }

  /**
   * Lo que este trayecto costaría con lo que hay escrito ahora (guardado o no). Misma
   * precedencia que la planilla: mandan las capturas, y el monto de catálogo cuenta solo si el
   * trayecto queda en cero.
   */
  importeEnPantalla(t: TrayectoDetalleDto): number {
    const suma = this.capturasDe(t.id).reduce((acc, f) => acc + (f.monto ?? 0), 0)
               + this.pendientesDe(t.id).reduce((acc, r) => acc + (r.monto ?? 0), 0);
    return this.aCentimos(suma > 0 ? suma : (t.montoCatalogo ?? 0));
  }

  /** True si con lo que hay escrito ese trayecto se pasa del tope. */
  excedeTope(t: TrayectoDetalleDto): boolean {
    return this.importeEnPantalla(t) > this.limiteTrayecto;
  }

  /** Lo que el trayecto cuesta tal como está GUARDADO, sin lo que se acaba de escribir. */
  private importeGuardado(t: TrayectoDetalleDto): number {
    const suma = this.totalCapturasTrayecto(t);
    return this.aCentimos(suma > 0 ? suma : (t.montoCatalogo ?? 0));
  }

  /** Los trayectos que con lo escrito quedarían por encima del tope y encima empeorados. */
  private get trayectosQueBloquean(): TrayectoDetalleDto[] {
    // Un trayecto que YA venía por encima —capturas anteriores a la regla, o un tope que se bajó
    // después— se tiene que poder seguir corrigiendo hacia abajo, y bloquearlo lo dejaría trabado
    // para siempre. Lo que se corta es empeorarlo. Misma regla que el backend
    // (ValidarTopeMovilidad).
    return (this.detalle?.trayectos ?? []).filter(
      (t) => this.excedeTope(t) && this.importeEnPantalla(t) > this.importeGuardado(t),
    );
  }

  /** True cuando algún trayecto pasado del tope es motivo para NO dejar guardar. */
  get topeBloqueaGuardar(): boolean {
    return this.trayectosQueBloquean.length > 0;
  }

  /**
   * Redondeo a céntimos. Sin esto un 20.10 + 24.90 contra un tope de 45 da -0.0000000000001 en
   * coma flotante y la pantalla bloquearía el guardado sin nada visible que corregir.
   */
  private aCentimos(monto: number): number {
    return Math.round(monto * 100) / 100;
  }

  // ── Guardar todo el modal de una vez ───────────────────────────────────

  /** Fila nueva que el usuario nunca tocó: la que aparece sola en cada trayecto. Se ignora. */
  private filaNuevaVacia(r: PendienteRow): boolean {
    return r.file === null && r.monto === null;
  }

  /** Fila nueva lista para subir: tiene imagen y un monto válido. */
  private filaNuevaCompleta(r: PendienteRow): boolean {
    return r.file !== null && r.monto !== null && r.monto >= 0;
  }

  /** Capturas nuevas de todos los trayectos, listas para subir. */
  private get nuevasParaSubir(): { trayectoId: number; file: File; monto: number }[] {
    const out: { trayectoId: number; file: File; monto: number }[] = [];
    this.pendientesByTrayecto.forEach((rows, trayectoId) => {
      rows.forEach((r) => {
        if (this.filaNuevaCompleta(r)) {
          out.push({ trayectoId, file: r.file as File, monto: r.monto as number });
        }
      });
    });
    return out;
  }

  /** Capturas ya subidas con algo distinto de lo guardado (monto, imagen o las dos). */
  private get edicionesParaGuardar(): { capturaId: number; monto: number; file: File | null }[] {
    const out: { capturaId: number; monto: number; file: File | null }[] = [];
    this.capturasByTrayecto.forEach((filas) => {
      filas.forEach((f) => {
        if (this.hayCambios(f)) {
          out.push({ capturaId: f.captura.id, monto: f.monto as number, file: f.file });
        }
      });
    });
    return out;
  }

  /** Una fila nueva a medio llenar (imagen sin monto, o monto sin imagen) frena el guardado. */
  private get hayFilasIncompletas(): boolean {
    let incompleta = false;
    this.pendientesByTrayecto.forEach((rows) => {
      rows.forEach((r) => {
        if (!this.filaNuevaVacia(r) && !this.filaNuevaCompleta(r)) incompleta = true;
      });
    });
    return incompleta;
  }

  /** Una captura ya subida a la que le borraron el monto (o le pusieron uno negativo). */
  private get hayMontoInvalido(): boolean {
    let invalido = false;
    this.capturasByTrayecto.forEach((filas) => {
      filas.forEach((f) => {
        if (this.hayCambios(f) && (f.monto === null || f.monto < 0)) invalido = true;
      });
    });
    return invalido;
  }

  /** Cuántas cosas se van a escribir: capturas nuevas + capturas corregidas. */
  get totalPendientes(): number {
    return this.nuevasParaSubir.length + this.edicionesParaGuardar.length;
  }

  get puedeGuardar(): boolean {
    if (this.guardando) return false;
    if (this.hayFilasIncompletas || this.hayMontoInvalido) return false;
    if (this.topeBloqueaGuardar) return false;
    return this.totalPendientes > 0;
  }

  /** Por qué el botón está apagado, cuando el motivo no se ve solo. Null si no hay nada que decir. */
  get aviso(): string | null {
    if (this.hayFilasIncompletas) return 'Hay capturas nuevas sin imagen o sin monto.';
    if (this.hayMontoInvalido) return 'Hay capturas sin monto.';

    const excedidos = this.trayectosQueBloquean;
    if (excedidos.length > 0) {
      const cuales = excedidos.map((t) => t.orden + 1).join(', ');
      return excedidos.length === 1
        ? `El trayecto ${cuales} se pasa del tope de S/ ${this.limiteTrayecto.toFixed(2)}.`
        : `Los trayectos ${cuales} se pasan del tope de S/ ${this.limiteTrayecto.toFixed(2)}.`;
    }
    return null;
  }

  get textoBotonGuardar(): string {
    const n = this.totalPendientes;
    return n === 0 ? 'Guardar cambios' : `Guardar ${n} cambio${n === 1 ? '' : 's'}`;
  }

  /**
   * Manda el modal entero en una sola llamada: las capturas nuevas de todos los trayectos y los
   * montos e imágenes corregidos de las que ya estaban. El backend responde con el detalle ya
   * actualizado, así que la pantalla se repinta sin volver a pedirlo.
   */
  guardarTodo(): void {
    if (!this.puedeGuardar) return;

    const nuevas = this.nuevasParaSubir;
    const ediciones = this.edicionesParaGuardar;
    const total = nuevas.length + ediciones.length;

    this.guardando = true;
    this.loader.show();
    this.service.guardarCapturas(this.solicitudId, nuevas, ediciones).subscribe({
      next: (detalle) => {
        this.algoCambio = true;
        this.aplicarDetalle(detalle);
        this.guardando = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: `${total} cambio${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'}`,
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loader.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
