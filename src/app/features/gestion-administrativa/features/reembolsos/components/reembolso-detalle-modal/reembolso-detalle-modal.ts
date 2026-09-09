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

  get porRevisar(): boolean {
    return (this.detalle?.porConfirmarCount ?? 0) > 0;
  }

  get porPagar(): boolean {
    const d = this.detalle;
    return !!d && d.porConfirmarCount === 0 && d.porPagarCount > 0;
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
