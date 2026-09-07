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

interface PendienteRow {
  file: File | null;
  preview: string | null;
  monto: number | null;
}

/**
 * Las capturas de movilidad de una salida, trayecto por trayecto: las que ya están cargadas (con
 * su monto editable y su botón de quitar) y las filas para agregar nuevas.
 *
 * Vive en el shared del módulo porque lo abren dos pantallas, en los dos momentos en que las
 * capturas se pueden tocar:
 *
 *  • Solicitud de Salidas — antes de rendir, para completar el sustento de cada trayecto.
 *  • Mis Rendiciones — al subsanar una rendición OBSERVADA en primera revisión, que es cuando el
 *    jefe pidió corregir capturas y montos. Ahí, después de corregir, hay que volver a generar la
 *    planilla desde la pantalla (el modal no la regenera: el PDF es de la planilla entera).
 *
 * El backend decide si se puede editar; el modo `subsanacion` solo cambia lo que dice el texto.
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
   * true = se abrió para subsanar una rendición observada. Cambia el título y el aviso: lo que se
   * espera no es "completar" el sustento sino corregir lo que el jefe observó.
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

  /** Map trayectoId → filas pendientes (cada trayecto tiene su propio set de filas en edición). */
  pendientesByTrayecto = new Map<number, PendienteRow[]>();

  /** id de la captura cuyo monto se está editando. null = ninguna. */
  editandoCapturaId: number | null = null;
  /** Valor en edición del monto (se confirma o se descarta sin tocar la fila original). */
  montoEnEdicion: number | null = null;
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
  }

  get titulo(): string {
    return this.subsanacion ? 'Corregir capturas y montos' : 'Subir capturas de movilidad';
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.solicitudId).subscribe({
      next: (data) => {
        this.detalle = data;
        // Inicializa una fila vacía por cada trayecto (para invitar a agregar capturas)
        data.trayectos.forEach((t) => {
          if (!this.pendientesByTrayecto.has(t.id)) {
            this.pendientesByTrayecto.set(t.id, [{ file: null, preview: null, monto: null }]);
          }
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
    this.close.emit(this.algoCambio);
  }

  pendientesDe(trayectoId: number): PendienteRow[] {
    return this.pendientesByTrayecto.get(trayectoId) ?? [];
  }

  agregarFila(trayectoId: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    rows.push({ file: null, preview: null, monto: null });
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  eliminarFila(trayectoId: number, index: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    const removed = rows.splice(index, 1)[0];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    if (rows.length === 0) rows.push({ file: null, preview: null, monto: null });
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

  totalCapturasTrayecto(t: TrayectoDetalleDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  subirTrayecto(trayectoId: number): void {
    if (!this.puedeSubirTrayecto(trayectoId)) return;
    const rows = this.pendientesDe(trayectoId);
    const items = rows.map((r) => ({ file: r.file as File, monto: r.monto as number }));

    this.loader.show();
    this.service.uploadCapturasToTrayecto(trayectoId, items).subscribe({
      next: (creadas) => {
        this.algoCambio = true;
        // Push creadas al trayecto correspondiente
        if (this.detalle) {
          const t = this.detalle.trayectos.find((tr) => tr.id === trayectoId);
          if (t) t.capturas = [...t.capturas, ...creadas];
        }
        // Reset filas de ese trayecto
        rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); });
        this.pendientesByTrayecto.set(trayectoId, [{ file: null, preview: null, monto: null }]);

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

  // ── Edición de una captura ya subida ───────────────────────────────────

  editarMonto(c: SolicitudSalidaCapturaDto): void {
    this.editandoCapturaId = c.id;
    this.montoEnEdicion = c.monto;
  }

  cancelarEdicion(): void {
    this.editandoCapturaId = null;
    this.montoEnEdicion = null;
  }

  get montoEnEdicionValido(): boolean {
    return this.montoEnEdicion !== null && this.montoEnEdicion >= 0;
  }

  guardarMonto(c: SolicitudSalidaCapturaDto): void {
    if (!this.montoEnEdicionValido || this.guardandoCapturaId !== null) return;
    const nuevo = this.montoEnEdicion as number;
    if (nuevo === c.monto) {
      this.cancelarEdicion();
      return;
    }

    this.guardandoCapturaId = c.id;
    this.service.actualizarMontoCaptura(c.id, nuevo).subscribe({
      next: () => {
        // Se pinta sobre la fila que ya está en pantalla: el total del trayecto se recalcula solo.
        c.monto = nuevo;
        this.algoCambio = true;
        this.guardandoCapturaId = null;
        this.cancelarEdicion();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCapturaId = null;
        this.errorService.handleError(err);
      },
    });
  }

  async quitarCaptura(t: TrayectoDetalleDto, c: SolicitudSalidaCapturaDto): Promise<void> {
    if (this.guardandoCapturaId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Quitar esta captura?',
      text: `Dejará de contar los S/ ${c.monto.toFixed(2)} en la planilla.`,
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.guardandoCapturaId = c.id;
    this.service.eliminarCaptura(c.id).subscribe({
      next: () => {
        t.capturas = t.capturas.filter((x) => x.id !== c.id);
        this.algoCambio = true;
        this.guardandoCapturaId = null;
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCapturaId = null;
        this.errorService.handleError(err);
      },
    });
  }
}
