import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SalidaDetalleService } from '../../services/salida-detalle.service';
import { SalidaCapturasEditor } from '../salida-capturas-editor/salida-capturas-editor';
import { CapturasEdicion } from '../salida-capturas-editor/capturas-edicion';
import {
  SolicitudSalidaDetalleDto,
  TrayectoDetalleDto,
} from '../../dtos/salida-detalle.dto';

/**
 * El detalle de una solicitud de salida: cabecera, trayectos con sus capturas y montos, adjuntos,
 * planilla y Consolidado del S10.
 *
 * Lo abren cinco pantallas y por eso vive en el shared del módulo:
 *  • Solicitud de Salidas — la salida es del propio usuario. Arranca en lectura; "Editar" pasa
 *    TODOS los trayectos a edición a la vez y un solo botón al pie guarda el lote entero; guardar
 *    vuelve a la lectura con el detalle que responde el backend, así que si con esas capturas la
 *    salida quedó apta, "Rendir" aparece en el acto sin cerrar el modal. Mientras se edita,
 *    "Rendir" no se ofrece: rendiría lo guardado, no lo que está en pantalla.
 *  • Mis Rendiciones — también la salida propia y en el mismo modo, desde el detalle de su
 *    planilla. Ya está rendida, así que no ofrece editar, rendir ni cancelar.
 *  • Gestión de Rendiciones, Consolidados y Reembolsos — en CONSULTA (`[cargar]`): la jefatura, el
 *    consolidador y Tesorería miran la salida de otro para ver sus capturas y montos. Ahí no se
 *    edita, no se rinde ni se cancela nada, y se nombra al trabajador.
 */
@Component({
  standalone: true,
  selector: 'app-salida-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, DraggableImage, SalidaCapturasEditor, TitleCasePipe],
  templateUrl: './salida-detalle-modal.html',
})
export class SalidaDetalleModal implements OnInit, OnDestroy {
  @Input({ required: true }) solicitudId!: number;

  /**
   * De dónde sale el detalle en CONSULTA: el endpoint de la pantalla anfitriona, que valida que la
   * salida esté en su alcance. Sin él, el modal es el del propio trabajador (Solicitud de Salidas),
   * con edición de capturas, "Rendir" y "Cancelar solicitud".
   */
  @Input() cargar: ((id: number) => Observable<SolicitudSalidaDetalleDto>) | null = null;

  /**
   * true = abre directo en edición: es el botón "Subir capturas" de la columna de acciones. Si la
   * salida ya no se puede editar (la tabla estaba desactualizada), abre en lectura.
   */
  @Input() iniciarEditando = false;

  /** Emite al cerrar: `true` si se guardó o quitó alguna captura (el padre debe recargar el listado). */
  @Output() close = new EventEmitter<boolean>();

  /**
   * "Rendir" desde el detalle. Solo avisa: la rendición (confirmación con los correos, envío a
   * primera revisión y recarga de la tabla) la resuelve la pantalla con el mismo camino que el botón
   * de la columna de acciones, así que el modal no duplica nada de ese flujo.
   */
  @Output() rendir = new EventEmitter<number>();

  /**
   * "Cancelar solicitud" desde el detalle. Igual que "Rendir", solo avisa: la confirmación, la
   * llamada y la recarga las resuelve la pantalla con el mismo camino que el "Cancelar" de la tabla.
   */
  @Output() cancelar = new EventEmitter<number>();

  detalle: SolicitudSalidaDetalleDto | null = null;

  /** La edición en curso de las capturas. null = modo lectura. */
  edicion: CapturasEdicion | null = null;

  /** Se guardó o quitó alguna captura desde que se abrió el modal. */
  private algoCambio = false;

  /**
   * Se quitó una captura en la edición y no se guardó nada después: `detalle` sigue siendo la foto
   * de antes (con esa captura y con un `aptaParaRendir` que puede ya no valer), así que salir de la
   * edición sin guardar obliga a pedirlo de nuevo.
   */
  private detalleDesactualizado = false;

  constructor(
    private service: SalidaDetalleService,
    private loader: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.cargarDetalle(this.iniciarEditando);
  }

  ngOnDestroy(): void {
    this.edicion?.liberar();
  }

  /** true = la salida es de otro y se está mirando desde una bandeja de revisión. */
  get consulta(): boolean {
    return this.cargar !== null;
  }

  /**
   * Lo que esta salida va a rendir: suma SOLO los trayectos que generan reembolso. Los que no
   * (motivo no reembolsable, motivo libre o recorrido excluido) no entran en la planilla, así que
   * sumarlos acá anunciaría un monto que el PDF no va a traer. Cada trayecto sigue mostrando su
   * propio monto en su fila, con el pill que dice si tiene reembolso o no.
   */
  get totalGeneral(): number {
    if (!this.detalle) return 0;
    return this.detalle.trayectos
      .filter((t) => t.esReembolsable === true)
      .reduce((acc, t) => acc + (t.montoTotal || 0), 0);
  }

  totalCapturas(t: TrayectoDetalleDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  /** Mismo criterio que "Subir capturas" en la tabla: aprobada y todavía sin rendir. */
  get puedeEditar(): boolean {
    return !this.consulta
        && this.detalle?.estadoAprobacion === 'Aprobado'
        && this.detalle.estadoRendicion !== 'Rendido';
  }

  cerrar(): void {
    this.close.emit(this.algoCambio);
  }

  rendirSolicitud(): void {
    if (this.edicion || this.consulta) return;
    this.rendir.emit(this.solicitudId);
  }

  /**
   * Mismo criterio que "Cancelar" en la tabla: solo mientras nadie la aprobó ni la rechazó. Nunca
   * convive con "Editar" ni con "Rendir", que son de lo aprobado. El backend re-valida.
   */
  get puedeCancelar(): boolean {
    return !this.consulta && this.detalle?.estadoAprobacion === 'Pendiente';
  }

  cancelarSolicitud(): void {
    if (!this.puedeCancelar) return;
    this.cancelar.emit(this.solicitudId);
  }

  /** @param editar true = al llegar el detalle entra en edición, si la salida todavía lo permite. */
  private cargarDetalle(editar = false): void {
    this.loader.show();
    const peticion = this.cargar
      ? this.cargar(this.solicitudId)
      : this.service.getDetalle(this.solicitudId);

    peticion.subscribe({
      next: (data) => {
        this.detalle = data;
        this.detalleDesactualizado = false;
        if (editar) this.editar();
        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.algoCambio);
      },
    });
  }

  // ── Modo edición ─────────────────────────────────────────────────────

  /** Pasa todos los trayectos a edición a la vez, cada uno con una fila nueva lista para cargar. */
  editar(): void {
    if (!this.detalle || !this.puedeEditar || this.edicion) return;
    this.edicion = new CapturasEdicion(this.detalle, true);
  }

  /**
   * Sale de la edición sin guardar, confirmando antes si hay algo escrito. Lo que ya se quitó no
   * vuelve —quitar se aplica al toque—, por eso en ese caso el detalle se pide de nuevo.
   */
  async cancelarEdicion(): Promise<void> {
    const edicion = this.edicion;
    if (!edicion || edicion.guardando) return;

    if (edicion.hayCambiosSinGuardar) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Tienes cambios sin guardar',
        text: 'Si sales de la edición, se pierden.',
        showCancelButton: true,
        confirmButtonText: 'Salir sin guardar',
        cancelButtonText: 'Seguir editando',
      });
      if (!result.isConfirmed) return;
    }

    edicion.liberar();
    this.edicion = null;
    if (this.detalleDesactualizado) this.cargarDetalle();
  }

  onCapturaQuitada(): void {
    this.algoCambio = true;
    this.detalleDesactualizado = true;
  }

  /**
   * Manda la edición entera en una sola llamada —capturas nuevas de todos los trayectos y montos e
   * imágenes corregidos— y vuelve a la lectura con el detalle que responde el backend, que ya trae
   * el `aptaParaRendir` recalculado.
   */
  guardarTodo(): void {
    const edicion = this.edicion;
    if (!edicion?.puedeGuardar) return;

    const total = edicion.totalPendientes;

    edicion.guardando = true;
    this.loader.show();
    this.service
      .guardarCapturas(this.solicitudId, edicion.nuevasParaSubir, edicion.edicionesParaGuardar)
      .subscribe({
        next: (detalle) => {
          this.algoCambio = true;
          this.detalleDesactualizado = false;
          edicion.liberar();
          this.edicion = null;
          this.detalle = detalle;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: `${total} cambio${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'}`,
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (err: HttpErrorResponse) => {
          edicion.guardando = false;
          this.loader.hide();
          this.errorService.handleError(err);
        },
      });
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Cancelado': return { bg: '#E5E7EB', text: '#4B5563' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }
}
