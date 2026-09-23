import {
  SolicitudSalidaCapturaDto,
  SolicitudSalidaDetalleDto,
  TrayectoDetalleDto,
} from '../../dtos/salida-detalle.dto';

/** Una fila nueva (todavía sin subir): imagen + monto. */
export interface CapturaNuevaFila {
  file: File | null;
  preview: string | null;
  monto: number | null;
}

/**
 * Una captura YA subida, con lo que el usuario tiene escrito encima. Lo guardado vive en
 * `captura` y lo editado al lado, así se puede comparar para saber si hay algo que guardar y la
 * fila original no se toca hasta que el backend confirma.
 */
export interface CapturaFila {
  /** Lo que está guardado en la base. */
  captura: SolicitudSalidaCapturaDto;
  /** Monto en el input. */
  monto: number | null;
  /** Imagen nueva elegida con "Reemplazar". null = se conserva la guardada. */
  file: File | null;
  /** ObjectURL de esa imagen nueva, para la miniatura y para poder revocarlo. */
  preview: string | null;
}

/**
 * La edición en curso de las capturas de movilidad de UNA salida, trayecto por trayecto: las que
 * ya están cargadas —con su monto y su imagen editables— y las filas para agregar nuevas, junto con
 * las reglas que deciden si el lote se puede guardar (filas completas y tope por trayecto).
 *
 * Es una clase suelta y no un componente porque la edición abarca TODOS los trayectos y se guarda
 * con un solo botón, mientras que cada trayecto se pinta aparte, dentro de su tarjeta
 * (`app-salida-capturas-editor`). La abren dos modales:
 *
 *  • el detalle de Solicitud de Salidas, en modo edición — antes de rendir;
 *  • el de corregir capturas de Mis Rendiciones — al subsanar una rendición observada.
 *
 * No habla con el backend: el modal manda `nuevasParaSubir` y `edicionesParaGuardar` en una sola
 * llamada y con la respuesta decide cómo sigue.
 */
export class CapturasEdicion {
  /** True mientras se guarda el lote o se quita una captura: bloquea toda la edición. */
  guardando = false;

  /** trayectoId → capturas ya subidas de ese trayecto, con su edición al lado. */
  private readonly capturasByTrayecto = new Map<number, CapturaFila[]>();

  /** trayectoId → filas nuevas (cada trayecto tiene su propio set de filas en edición). */
  private readonly pendientesByTrayecto = new Map<number, CapturaNuevaFila[]>();

  /**
   * @param conFilaInicial true = cada trayecto arranca con una fila nueva lista y nunca se queda
   * sin ella: antes de rendir, cargar capturas que todavía no hay es el objetivo. false = arranca
   * sin ninguna y se piden con "Agregar otra captura": al subsanar lo que se espera es corregir las
   * que ya están, y una fila vacía de entrada solo estorbaba.
   */
  constructor(
    private readonly detalle: SolicitudSalidaDetalleDto,
    private readonly conFilaInicial: boolean,
  ) {
    detalle.trayectos.forEach((t) => {
      this.capturasByTrayecto.set(
        t.id,
        t.capturas.map((c) => ({ captura: c, monto: c.monto, file: null, preview: null })),
      );
      this.pendientesByTrayecto.set(t.id, conFilaInicial ? [this.filaVacia()] : []);
    });
  }

  /** Suelta las imágenes elegidas en pantalla. Va al descartar la edición o al cerrar el modal. */
  liberar(): void {
    this.pendientesByTrayecto.forEach((rows) =>
      rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); }),
    );
    this.capturasByTrayecto.forEach((filas) =>
      filas.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); }),
    );
  }

  private filaVacia(): CapturaNuevaFila {
    return { file: null, preview: null, monto: null };
  }

  /** Pone la imagen elegida en una fila, nueva o ya subida (en esta última, como reemplazo). */
  elegirImagen(fila: CapturaFila | CapturaNuevaFila, file: File): void {
    if (fila.preview) URL.revokeObjectURL(fila.preview);
    fila.file = file;
    fila.preview = URL.createObjectURL(file);
  }

  // ── Capturas ya subidas: monto e imagen editables en el sitio ──────────

  capturasDe(trayectoId: number): CapturaFila[] {
    return this.capturasByTrayecto.get(trayectoId) ?? [];
  }

  /** Lo que se muestra en la miniatura: la imagen nueva si se eligió una, si no la guardada. */
  imagenDe(fila: CapturaFila): string {
    return fila.preview ?? fila.captura.imageUrl;
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

  /** Saca de la edición una captura que el backend ya dio de baja. */
  quitarCaptura(trayectoId: number, fila: CapturaFila): void {
    if (fila.preview) URL.revokeObjectURL(fila.preview);
    this.capturasByTrayecto.set(trayectoId, this.capturasDe(trayectoId).filter((f) => f !== fila));
  }

  // ── Filas nuevas ───────────────────────────────────────────────────────

  pendientesDe(trayectoId: number): CapturaNuevaFila[] {
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
    if (rows.length === 0 && this.conFilaInicial) rows.push(this.filaVacia());
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  // ── Tope de movilidad por trayecto ─────────────────────────────────────
  // El tope es de CADA trayecto, no del día ni de la solicitud: varios trayectos pueden sumar
  // más que el tope entre todos y eso está permitido — lo que un día no aguanta se reparte al
  // imprimir la planilla, donde el trayecto que desborda sale con la fecha del día siguiente.
  // El backend rehace la misma cuenta al guardar; esto es la ayuda, no el control.

  /** Tope en soles de cada trayecto. */
  get limiteTrayecto(): number {
    return this.detalle.limiteMovilidadTrayecto ?? 0;
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
    const suma = this.capturasDe(t.id).reduce((acc, f) => acc + (f.captura.monto || 0), 0);
    return this.aCentimos(suma > 0 ? suma : (t.montoCatalogo ?? 0));
  }

  /** Los trayectos que con lo escrito quedarían por encima del tope y encima empeorados. */
  private get trayectosQueBloquean(): TrayectoDetalleDto[] {
    // Un trayecto que YA venía por encima —capturas anteriores a la regla, o un tope que se bajó
    // después— se tiene que poder seguir corrigiendo hacia abajo, y bloquearlo lo dejaría trabado
    // para siempre. Lo que se corta es empeorarlo. Misma regla que el backend
    // (ValidarTopeMovilidad).
    return this.detalle.trayectos.filter(
      (t) => this.excedeTope(t) && this.importeEnPantalla(t) > this.importeGuardado(t),
    );
  }

  /**
   * Redondeo a céntimos. Sin esto un 20.10 + 24.90 contra un tope de 45 da -0.0000000000001 en
   * coma flotante y la pantalla bloquearía el guardado sin nada visible que corregir.
   */
  private aCentimos(monto: number): number {
    return Math.round(monto * 100) / 100;
  }

  // ── El lote a guardar ──────────────────────────────────────────────────

  /** Fila nueva que el usuario nunca tocó: la que aparece sola en cada trayecto. Se ignora. */
  private filaNuevaVacia(r: CapturaNuevaFila): boolean {
    return r.file === null && r.monto === null;
  }

  /**
   * Fila nueva lista para subir: tiene imagen y un monto mayor a 0. El 0 no pasa —y el
   * negativo tampoco— porque una captura de S/ 0.00 no es un gasto: no hay nada que
   * reembolsar. El backend corta igual (GuardarCapturas).
   */
  private filaNuevaCompleta(r: CapturaNuevaFila): boolean {
    return r.file !== null && r.monto !== null && r.monto > 0;
  }

  /** Capturas nuevas de todos los trayectos, listas para subir. */
  get nuevasParaSubir(): { trayectoId: number; file: File; monto: number }[] {
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
  get edicionesParaGuardar(): { capturaId: number; monto: number; file: File | null }[] {
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

  /** Una captura ya subida a la que le borraron el monto (o la dejaron en 0 o en negativo). */
  private get hayMontoInvalido(): boolean {
    let invalido = false;
    this.capturasByTrayecto.forEach((filas) => {
      filas.forEach((f) => {
        if (this.hayCambios(f) && (f.monto === null || f.monto <= 0)) invalido = true;
      });
    });
    return invalido;
  }

  /** Cuántas cosas se van a escribir: capturas nuevas + capturas corregidas. */
  get totalPendientes(): number {
    return this.nuevasParaSubir.length + this.edicionesParaGuardar.length;
  }

  /** True si hay algo escrito que se pierde al salir sin guardar, completo o a medias. */
  get hayCambiosSinGuardar(): boolean {
    return this.totalPendientes > 0 || this.hayFilasIncompletas;
  }

  get puedeGuardar(): boolean {
    if (this.guardando) return false;
    if (this.hayFilasIncompletas || this.hayMontoInvalido) return false;
    if (this.trayectosQueBloquean.length > 0) return false;
    return this.totalPendientes > 0;
  }

  /** Por qué el botón está apagado, cuando el motivo no se ve solo. Null si no hay nada que decir. */
  get aviso(): string | null {
    if (this.hayFilasIncompletas) return 'Cada captura nueva necesita imagen y un monto mayor a 0.';
    if (this.hayMontoInvalido) return 'El monto de una captura tiene que ser mayor a 0.';

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
}
