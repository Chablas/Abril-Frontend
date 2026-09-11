import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
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

/**
 * Un documento de la sección Respaldo: qué archivo se abre y cómo se nombra en la lista.
 * Vive acá porque es puro armado de pantalla — el backend sirve las dos copias, original y
 * firmada, y esta pantalla elige cuál enseñar.
 */
interface RespaldoDoc {
  url: string;
  nombre: string;
  etiqueta: string;
  /** false = la copia firmada no existe y se está mostrando el original; se dice en la etiqueta. */
  firmado: boolean;
}

/**
 * El expediente de una planilla para Tesorería: qué se está pagando, a quién, con qué respaldo
 * y con qué firma. Es donde vive la revisión documental que el requerimiento pide antes de
 * proceder (11.1): planilla, Consolidado del S10 con su guía, firma de la jefatura y el detalle
 * de cada tramo con sus vouchers.
 *
 * Las dos acciones también están acá porque el pago individual es "esta planilla" (RF-TES-08);
 * la selección múltiple de la tabla resuelve el caso masivo.
 */
@Component({
  standalone: true,
  selector: 'app-reembolso-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, DocumentViewer, TitleCasePipe],
  templateUrl: './reembolso-detalle-modal.html',
})
export class ReembolsoDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;
  /** true = la planilla cambió de estado y el listado tiene que recargarse. */
  @Output() close = new EventEmitter<boolean>();

  detalle: ReembolsoDetalleDto | null = null;

  /** Salidas con el desglose de tramos abierto. Arranca cerrado: la tabla ya es larga. */
  expandidas = new Set<number>();

  /** Planilla de Gasto y Consolidado del S10 firmados: la lista de la sección Respaldo. */
  respaldo: RespaldoDoc[] = [];

  // Visor de PDF/imágenes: los vouchers se abren sin salir de la revisión (RF-TES-13).
  visorUrl = '';
  visorNombre = '';

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
    this.service.getDetalle(this.rendicionId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.respaldo = this.armarRespaldo(data);
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

  // ── Respaldo ─────────────────────────────────────────────────────────

  /**
   * Los dos únicos documentos que la revisión documental pide ver (11.1 del requerimiento:
   * "mostrar únicamente la documentación consolidada necesaria"), y en su copia FIRMADA por la
   * jefatura: es la que respalda el pago, y a Tesorería solo le llega lo ya firmado (RG-25).
   *
   * Si la firma no llegó a estamparse —rendiciones anteriores a que aprobar fuera firmar— se
   * lista el original y la etiqueta lo dice, en vez de dejar a Tesorería sin nada que mirar.
   */
  private armarRespaldo(d: ReembolsoDetalleDto): RespaldoDoc[] {
    const docs: RespaldoDoc[] = [
      d.pdfFirmadoUrl
        ? { url: d.pdfFirmadoUrl,
            nombre: d.pdfFirmadoFilename ?? 'Planilla firmada',
            etiqueta: 'planilla de gasto firmada',
            firmado: true }
        : { url: d.pdfUrl,
            nombre: d.pdfFilename,
            etiqueta: 'planilla de gasto — sin la firma de jefatura',
            firmado: false },
    ];

    const s10 = d.consolidadoS10;
    if (s10) {
      docs.push(
        s10.pdfFirmadoUrl
          ? { url: s10.pdfFirmadoUrl,
              nombre: s10.pdfFirmadoFilename ?? 'Consolidado del S10 firmado',
              etiqueta: 'Consolidado del S10 firmado',
              firmado: true }
          : { url: s10.pdfUrl,
              nombre: s10.pdfFilename,
              etiqueta: 'Consolidado del S10 — sin la firma de jefatura',
              firmado: false },
      );
    }

    return docs;
  }

  // ── Tramos ───────────────────────────────────────────────────────────

  toggleTramos(s: ReembolsoSalidaDto): void {
    if (this.expandidas.has(s.id)) this.expandidas.delete(s.id);
    else                           this.expandidas.add(s.id);
  }

  verArchivo(url: string | null | undefined, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  /** Devuelta por Tesorería y esperando la subsanación (RG-49): no se acciona nada más desde acá. */
  get observada(): boolean {
    return (this.detalle?.observadasCount ?? 0) > 0;
  }

  get porRevisar(): boolean {
    return !this.observada && (this.detalle?.porConfirmarCount ?? 0) > 0;
  }

  get porPagar(): boolean {
    const d = this.detalle;
    return !this.observada && !!d && d.porConfirmarCount === 0 && d.porPagarCount > 0;
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
      title: '¿Confirmar la revisión de esta planilla?',
      text: 'Queda habilitada para el pago. No se avisa a nadie todavía.',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C2410C',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.confirmarRevision({ rendicionIds: [d.id], solicitudIds: [] }));
  }

  /**
   * Devuelve la planilla con un motivo. No va al Coordinador ERP directamente: vuelve al
   * consolidador, que decide si recarga el Consolidado del S10 o le pide la corrección al ERP con
   * su propio «MOTIVO *» (RG-21).
   */
  async observar(): Promise<void> {
    const d = this.detalle;
    if (!d || !this.puedeObservar) return;

    const seleccion = { rendicionIds: [d.id], solicitudIds: [] };
    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: `¿Observar el reembolso de ${d.codigo}?`,
      nota:
        'Vuelve al consolidador para que recargue el Consolidado del S10 o le pida la corrección ' +
        'al Coordinador ERP. Al recargarlo pasa otra vez por la firma de la jefatura.',
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

  async marcarPagada(): Promise<void> {
    const d = this.detalle;
    if (!d || !this.porPagar) return;

    const monto = d.montoTotal.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const seleccion = { rendicionIds: [d.id], solicitudIds: [] };
    const result = await confirmarConCorreos({
      titulo: '¿Marcar esta planilla como pagada?',
      nota: `${d.porPagarCount} salida(s) por S/ ${monto}.`,
      avisos: await pedirAvisos(this.service.correoPreviewPago(seleccion)),
      confirmButtonText: 'Sí, marcar como pagada',
      confirmButtonColor: '#15803D',
    });
    if (!result.isConfirmed) return;

    this.ejecutar(this.service.marcarPagadas(seleccion));
  }

  /**
   * Las dos acciones terminan igual: se recarga el detalle para que la pantalla muestre el estado
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
   * Aviso de descuadre entre lo rendido en Abril One y lo que declara el Consolidado del S10.
   * La jefatura ya no puede aprobar con diferencia (RG-31), pero los consolidados subidos antes
   * de que el formulario pidiera el monto no tienen el dato: si falta, no se afirma nada.
   */
  get diferenciaS10(): number | null {
    const s10 = this.detalle?.consolidadoS10?.montoTotal;
    if (s10 == null || !this.detalle) return null;
    const dif = Math.round((s10 - this.detalle.montoTotal) * 100) / 100;
    return dif === 0 ? null : dif;
  }
}
