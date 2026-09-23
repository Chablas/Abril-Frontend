import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ReembolsosService } from '../../services/reembolsos.service';
import { ReembolsoDetalleDto, ReembolsoSalidaDto } from '../../dtos/reembolso.dto';
import {
  reembolsoColors,
  reembolsoLabelCorto,
} from '../../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';
import { nombreConsolidado } from '../../../../shared/consolidado-nombre';
import { SalidaDetalleModal } from '../../../../shared/components/salida-detalle-modal/salida-detalle-modal';
import { DocumentoEmbebido } from '../../../../shared/components/documento-embebido/documento-embebido';

/**
 * Uno de los dos documentos que se muestran embebidos: cuál copia se enseña. Vive acá porque es
 * puro armado de pantalla — el backend sirve las dos copias, original y firmada, y esta pantalla
 * elige cuál enseñar.
 */
interface DocumentoRespaldo {
  clave: 'planilla-grupal' | 'consolidado';
  etiqueta: string;
  nombre: string;
  url: string;
  /** false = la copia firmada no existe y se está mostrando el original. */
  firmado: boolean;
}

/**
 * El expediente de un Consolidado del S10 para Tesorería: qué se está pagando, a quién, con qué
 * respaldo y con qué firma. Es donde vive la revisión documental que el requerimiento pide antes
 * de proceder (11.1): la planilla grupal y el Consolidado del S10 firmados, a la vista sin salir de
 * la revisión (RF-TES-13), y las rendiciones que cubre con, en el ojo de cada salida, sus
 * trayectos con los vouchers.
 *
 * La unidad es el documento entero y no una de sus planillas: es lo que la jefatura firmó y lo que
 * el S10 registró con un solo importe, así que también es lo que se confirma, se observa y se paga.
 */
@Component({
  standalone: true,
  selector: 'app-reembolso-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe, SalidaDetalleModal, DocumentoEmbebido],
  templateUrl: './reembolso-detalle-modal.html',
})
export class ReembolsoDetalleModal implements OnInit {
  @Input({ required: true }) consolidadoId!: number;
  /** true = el consolidado cambió de estado y el listado tiene que recargarse. */
  @Output() close = new EventEmitter<boolean>();

  detalle: ReembolsoDetalleDto | null = null;

  /** Salida cuyo detalle (el ojo de la tabla) está abierto. null = cerrado. */
  salidaId: number | null = null;

  /** El detalle de la salida en consulta, con el endpoint de la bandeja de Tesorería. */
  readonly cargarSalida = (id: number) => this.service.getSalidaDetalle(id);

  /** La planilla grupal y el Consolidado del S10, cada uno con su PDF embebido debajo del enlace. */
  documentos: DocumentoRespaldo[] = [];

  constructor(
    private service: ReembolsosService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.consolidadoId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.documentos = this.armarDocumentos(data);
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(false);
      },
    });
  }

  cerrar(): void {
    this.close.emit(this.huboCambios);
  }

  private huboCambios = false;

  /** "CONS-GTH-2026-001 · N.° 12345": los dos nombres del documento, el nuestro y el del S10. */
  get titulo(): string {
    return nombreConsolidado(this.detalle);
  }

  // ── Documentos ───────────────────────────────────────────────────────

  /**
   * Los dos documentos del consolidado en su copia FIRMADA por la jefatura, que es la que respalda
   * el pago (RG-25): primero la planilla grupal —el gasto de todo lo que se paga acá en un solo
   * documento— y después el Consolidado del S10. Las planillas de gasto de cada rendición no se
   * muestran: la grupal ya las junta.
   *
   * Si la firma no llegó a estamparse —consolidados aprobados antes de que ese documento se
   * firmara— se muestra el original marcado «Sin firma», en vez de dejar a Tesorería sin nada que
   * mirar.
   */
  private armarDocumentos(d: ReembolsoDetalleDto): DocumentoRespaldo[] {
    const docs: DocumentoRespaldo[] = [];

    const grupalFirmada = !!d.planillaGrupalFirmadoUrl;
    const grupalUrl = d.planillaGrupalFirmadoUrl ?? d.planillaGrupalUrl;
    if (grupalUrl) {
      docs.push({
        clave: 'planilla-grupal',
        etiqueta: grupalFirmada ? 'Planilla grupal firmada' : 'Planilla grupal',
        nombre: (grupalFirmada ? d.planillaGrupalFirmadoFilename : d.planillaGrupalFilename)
          ?? 'Planilla grupal',
        url: grupalUrl,
        firmado: grupalFirmada,
      });
    }

    const s10Firmado = !!d.pdfFirmadoUrl;
    docs.push({
      clave: 'consolidado',
      etiqueta: s10Firmado ? 'Consolidado del S10 firmado' : 'Consolidado del S10',
      nombre: (s10Firmado ? d.pdfFirmadoFilename : d.pdfFilename) ?? 'Consolidado del S10',
      url: d.pdfFirmadoUrl ?? d.pdfUrl,
      firmado: s10Firmado,
    });

    return docs;
  }

  /**
   * Al recargar el detalle después de una acción, el documento que no cambió conserva sus hojas
   * dibujadas en vez de volver a bajarse.
   */
  readonly porClave = (_: number, doc: DocumentoRespaldo) => doc.clave;

  /** Las salidas de una de las planillas que cubre el consolidado. */
  salidasDe(rendicionId: number): ReembolsoSalidaDto[] {
    return this.detalle?.salidas.filter((s) => s.rendicionId === rendicionId) ?? [];
  }

  // ── Detalle de una salida ────────────────────────────────────────────

  verSalida(solicitudId: number): void {
    this.salidaId = solicitudId;
  }

  cerrarSalida(): void {
    this.salidaId = null;
    this.cdr.detectChanges();
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  /** Devuelto por Tesorería y esperando la subsanación (RG-49): no se acciona nada más desde acá. */
  get observado(): boolean {
    return (this.detalle?.observadasCount ?? 0) > 0;
  }

  get porRevisar(): boolean {
    return !this.observado && (this.detalle?.porConfirmarCount ?? 0) > 0;
  }

  get porPagar(): boolean {
    const d = this.detalle;
    return !this.observado && !!d && d.porConfirmarCount === 0 && d.porPagarCount > 0;
  }

  /** Se puede observar desde los dos pasos previos al pago (RG-49). */
  get puedeObservar(): boolean {
    return this.porRevisar || this.porPagar;
  }

  async confirmarRevision(): Promise<void> {
    const d = this.detalle;
    if (!d || !this.porRevisar) return;

    // Sin preview de correos: confirmar la revisión es un paso interno y no avisa a nadie.
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Confirmar la revisión de este consolidado?',
      text: 'Queda habilitado para el pago. No se avisa a nadie todavía.',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C2410C',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.confirmarRevision({ consolidadoIds: [d.id] }));
  }

  /**
   * Devuelve el consolidado con un motivo. No va al Coordinador ERP directamente: vuelve al
   * consolidador, que decide si recarga el Consolidado del S10 o le pide la corrección al ERP con
   * su propio «MOTIVO *» (RG-21).
   */
  async observar(): Promise<void> {
    const d = this.detalle;
    if (!d || !this.puedeObservar) return;

    const seleccion = { consolidadoIds: [d.id] };
    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: '¿Observar este reembolso?',
      nota: 'Vuelve al consolidador.',
      avisos: await pedirAvisos(this.service.correoPreviewObservacion(seleccion)),
      observacion: {
        label: 'Motivo',
        placeholder: 'Qué tiene que corregirse en el Consolidado del S10…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.ejecutar(this.service.observar({ ...seleccion, observacion }));
  }

  async marcarPagado(): Promise<void> {
    const d = this.detalle;
    if (!d || !this.porPagar) return;

    const monto = d.montoTotal.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const seleccion = { consolidadoIds: [d.id] };
    const result = await confirmarConCorreos({
      titulo: '¿Marcar este consolidado como pagado?',
      nota: `${d.porPagarCount} salida(s) por S/ ${monto}.`,
      avisos: await pedirAvisos(this.service.correoPreviewPago(seleccion)),
      confirmButtonText: 'Sí, marcar como pagado',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.marcarPagadas(seleccion));
  }

  /**
   * Las tres acciones terminan igual: se recarga el detalle para que la pantalla muestre el estado
   * nuevo sin cerrarse, y se marca que el listado de atrás quedó desactualizado.
   */
  private ejecutar(peticion: Observable<{ message: string }>): void {
    this.loader.show();
    peticion.subscribe({
      next: (res) => {
        this.loader.hide();
        this.huboCambios = true;
        Swal.fire({ title: res.message, icon: 'success', timer: 1800, showConfirmButton: false });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;

  /**
   * Descuadre entre lo que declara el Consolidado del S10 y lo que suman las planillas COMPLETAS
   * que cubre. Se compara documento contra documento: el importe del S10 es de todo lo que cubre,
   * y una sola de sus planillas nunca iba a coincidir con él.
   *
   * La jefatura ya no puede aprobar con diferencia (RG-31), pero los consolidados subidos antes de
   * que el formulario pidiera el monto no tienen el dato: si falta, no se afirma nada.
   */
  get diferenciaS10(): number | null {
    const d = this.detalle;
    if (!d || d.montoS10 == null) return null;
    const dif = Math.round((d.montoS10 - d.montoPlanillas) * 100) / 100;
    return dif === 0 ? null : dif;
  }

  /** Lo que se paga por este documento es menos que el documento entero: falta firma de alguien. */
  get pagoParcial(): boolean {
    const d = this.detalle;
    return !!d && d.montoTotal !== d.montoPlanillas;
  }

}
