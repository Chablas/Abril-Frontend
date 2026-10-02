import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { swalUdpSuccess } from '../../../../../shared/utils/sweetalert-udp';
import { ContratosService } from '../../services/contratos.service';
import {
  ProjectContractDTO,
  ProjectContractMilestoneDTO,
  ProjectContractScannedDocDTO,
  ProjectContractStep6SignaturesDTO,
} from '../../dtos/contrato.dtos';
import {
  CONTRATO_PASOS,
  SLOTS_ESCANEO,
  TOTAL_PASOS,
  ULTIMO_ESTADO_EDITABLE,
  estadoBadge,
  nombrePaso,
} from '../../constants/contrato-pasos';
import { recalcularHitos, sumaPorcentajes } from '../../utils/contrato-local';

type FirmaKey = keyof ProjectContractStep6SignaturesDTO;

interface RequisitoGeneracion {
  label: string;
  ok: boolean;
  nota?: string;
}

/**
 * Detalle de un contrato con su flujo de 9 pasos (mismo esquema que el detalle de Adjudicaciones:
 * stepper clickeable arriba + contenido del paso que se está viendo abajo).
 *
 * Cada acción aparece solo en el estado que le corresponde, con las mismas reglas que valida el
 * backend (400 si no corresponde): datos/hitos/generar ≤ 5, envío ≤ 3 con al menos un hito,
 * llegada 4-5, firmas 5-6, escaneo 6-7, notificación 7 con las 3 firmas, cierre 8.
 *
 * El backend no avanza los estados 2 y 3 (un contrato queda en 1 hasta que se envía en el paso
 * 4): por eso los pasos 1-4 se tratan como una sola fase de trabajo mientras el estado sea ≤ 3.
 *
 * Todas las mutaciones actualizan el contrato en memoria con lo que se envió (o con lo que
 * devolvió el backend) en vez de recargar el detalle — 1 acción = 1 HTTP. `contrato` es la misma
 * referencia que la fila de la lista, así que la lista se actualiza sola.
 */
@Component({
  selector: 'app-contrato-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, DatePicker, TitleCasePipe, DecimalPipe],
  templateUrl: './contrato-detalle.html',
  styleUrls: ['../../shared/contratos-ui.css', './contrato-detalle.css'],
})
export class ContratoDetalle implements OnInit {
  @Input({ required: true }) contrato!: ProjectContractDTO;
  /** false cuando el contrato se acaba de crear en esta sesión: ya está completo, no hace falta el GET. */
  @Input() requiereCarga = true;
  @Input() puedeEditar = false;
  @Input() projectName = '';

  @Output() closeModal = new EventEmitter<void>();
  /** Pide a la página abrir el formulario de edición (se abre como modal hermano, no anidado). */
  @Output() editar = new EventEmitter<ProjectContractDTO>();

  readonly pasos = CONTRATO_PASOS;
  readonly totalPasos = TOTAL_PASOS;
  readonly slotsEscaneo = SLOTS_ESCANEO;
  readonly accent = 'var(--color-abril-standard)';
  readonly nombrePaso = nombrePaso;
  readonly estadoBadge = estadoBadge;

  loading = false;
  viewStep = 2;
  /** Se generó el documento en esta sesión (el DTO no dice si ya se generó antes). */
  documentoGenerado = false;

  // ── Hito nuevo ─────────────────────────────────────────────────────────────
  hitoDescripcion = '';
  hitoPorcentaje: number | null = null;
  hitoSubmitted = false;
  savingHito = false;

  // ── Pago de un hito (edición en línea, una fila a la vez) ─────────────────
  pagoHitoId: number | null = null;
  pagoFecha: string | null = null;
  pagoChequeRecibo = '';
  pagoObservacion = '';
  savingPago = false;

  // ── Paso 7 ─────────────────────────────────────────────────────────────────
  /**
   * Escaneos subidos EN ESTA SESIÓN, por slot. GET /{id} todavía no devuelve los escaneos ya
   * guardados, así que al reabrir el detalle solo se sabe que hay al menos uno (estado ≥ 7).
   */
  escaneos: Partial<Record<number, ProjectContractScannedDocDTO>> = {};
  subiendoSlot: number | null = null;

  // ── Paso 5 ─────────────────────────────────────────────────────────────────
  llegadaConObservaciones: boolean | null = null;
  llegadaObservacion = '';
  llegadaSubmitted = false;

  saving = false;
  savingFirma: FirmaKey | null = null;

  readonly firmas: { key: FirmaKey; label: string }[] = [
    { key: 'step6SignedJefeProyectos', label: 'Jefe de Proyectos' },
    { key: 'step6SignedGerenteInmobiliario', label: 'Gerente Inmobiliario' },
    { key: 'step6SignedGerenteGeneral', label: 'Gerente General' },
  ];

  constructor(
    private service: ContratosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (!this.requiereCarga) {
      this.alCargar();
      return;
    }
    this.loading = true;
    this.service.getById(this.contrato.projectContractId).subscribe({
      next: (detalle) => {
        Object.assign(this.contrato, detalle);
        recalcularHitos(this.contrato);
        this.loading = false;
        this.alCargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  private alCargar(): void {
    this.viewStep = this.pasoSiguiente;
    this.llegadaConObservaciones = this.contrato.arrivedWithObservations ?? null;
    this.llegadaObservacion = this.contrato.arrivalObservation ?? '';
  }

  // ── Estado / navegación ────────────────────────────────────────────────────

  get estado(): number {
    return this.contrato.projectContractStatusId;
  }

  get editable(): boolean {
    return this.puedeEditar && this.estado <= ULTIMO_ESTADO_EDITABLE;
  }

  get todasLasFirmas(): boolean {
    return this.firmas.every((f) => this.contrato[f.key]);
  }

  get firmasCompletas(): number {
    return this.firmas.filter((f) => this.contrato[f.key]).length;
  }

  /** Paso cuya acción está pendiente — donde se abre el detalle y el que el stepper marca como actual. */
  get pasoSiguiente(): number {
    const e = this.estado;
    if (e <= 3) {
      if (this.documentoGenerado) return 4;
      return this.datosListos ? 3 : 2;
    }
    if (e === 4) return 5;
    if (e === 5) return 6;
    if (e === 6) return this.todasLasFirmas ? 7 : 6;
    if (e === 7) return 8;
    if (e === 8) return 9;
    return TOTAL_PASOS;
  }

  /** Último paso que se puede abrir. Mientras el estado sea ≤ 3, los pasos 1-4 son la misma fase. */
  get pasoMaximoVisible(): number {
    return Math.max(this.estado <= 3 ? 4 : this.estado, this.pasoSiguiente);
  }

  pasoCompletado(paso: number): boolean {
    if (this.estado >= TOTAL_PASOS) return true;
    return paso < this.pasoSiguiente;
  }

  puedeVer(paso: number): boolean {
    return paso >= 1 && paso <= this.pasoMaximoVisible;
  }

  irAPaso(paso: number): void {
    if (this.puedeVer(paso)) this.viewStep = paso;
  }

  anterior(): void {
    this.irAPaso(this.viewStep - 1);
  }

  siguiente(): void {
    this.irAPaso(this.viewStep + 1);
  }

  private avanzarEstado(nuevoEstado: number): void {
    this.contrato.projectContractStatusId = nuevoEstado;
    this.contrato.projectContractStatusDescription = nombrePaso(nuevoEstado);
  }

  // ── Paso 2: hitos de pago ──────────────────────────────────────────────────

  get sumaHitos(): number {
    return sumaPorcentajes(this.contrato);
  }

  get montoHitos(): number {
    return this.contrato.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  }

  get porcentajeDisponible(): number {
    return Math.max(0, Math.round((100 - this.sumaHitos) * 100) / 100);
  }

  get hitoPorcentajeInvalido(): boolean {
    const p = Number(this.hitoPorcentaje);
    return this.hitoPorcentaje === null || !(p > 0) || p > this.porcentajeDisponible;
  }

  get montoHitoNuevo(): number {
    const p = Number(this.hitoPorcentaje);
    return p > 0 ? Math.round((p / 100) * this.contrato.amount * 100) / 100 : 0;
  }

  agregarHito(): void {
    this.hitoSubmitted = true;
    if (!this.hitoDescripcion.trim() || this.hitoPorcentajeInvalido || this.savingHito || !this.editable) return;

    this.savingHito = true;
    this.loaderService.show();
    this.service
      .agregarHito(this.contrato.projectContractId, {
        description: this.hitoDescripcion.trim(),
        percentage: Number(this.hitoPorcentaje),
      })
      .subscribe({
        // El backend devuelve la lista completa ya recalculada (monto y garantía).
        next: (hitos) => {
          this.contrato.milestones = hitos;
          this.limpiarHito();
          this.savingHito = false;
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.savingHito = false;
          this.errorService.handleError(err);
        },
      });
  }

  private limpiarHito(): void {
    this.hitoDescripcion = '';
    this.hitoPorcentaje = null;
    this.hitoSubmitted = false;
  }

  // ── Pago de un hito (cualquier estado) ─────────────────────────────────────

  abrirPago(hito: ProjectContractMilestoneDTO): void {
    if (!this.puedeEditar) return;
    this.pagoHitoId = hito.projectContractMilestoneId;
    this.pagoFecha = hito.paidDate ?? null;
    this.pagoChequeRecibo = hito.chequeRecibo ?? '';
    this.pagoObservacion = hito.observation ?? '';
  }

  cancelarPago(): void {
    this.pagoHitoId = null;
  }

  guardarPago(): void {
    const id = this.pagoHitoId;
    if (id === null || this.savingPago || !this.puedeEditar) return;

    this.savingPago = true;
    this.loaderService.show();
    this.service
      .registrarPagoHito(id, {
        paidDate: this.pagoFecha || null,
        chequeRecibo: this.pagoChequeRecibo.trim() || null,
        observation: this.pagoObservacion.trim() || null,
      })
      .subscribe({
        next: (actualizado) => {
          const i = this.contrato.milestones.findIndex((m) => m.projectContractMilestoneId === id);
          if (i >= 0) this.contrato.milestones[i] = actualizado;
          this.pagoHitoId = null;
          this.savingPago = false;
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.savingPago = false;
          this.errorService.handleError(err);
        },
      });
  }

  eliminarHito(hito: ProjectContractMilestoneDTO): void {
    if (!this.editable) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar este hito de pago?',
      text: `${hito.description} (${hito.percentage}%)`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C0392B',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarHito(hito.projectContractMilestoneId).subscribe({
        // Devuelve los hitos que quedan, ya recalculados (el nuevo último pasa a ser garantía).
        next: (hitos) => {
          this.contrato.milestones = hitos;
          if (this.pagoHitoId === hito.projectContractMilestoneId) this.pagoHitoId = null;
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── Paso 3: generar ────────────────────────────────────────────────────────

  /**
   * Lo mismo que valida el backend antes de generar (ProjectContractService.ValidateGenerationData),
   * menos los datos del proyecto/contratista que no se cargan desde esta pantalla.
   */
  get requisitosGeneracion(): RequisitoGeneracion[] {
    const c = this.contrato;
    return [
      { label: 'Tipo de servicio', ok: !!c.serviceDescription?.trim() },
      { label: 'Fecha de firma', ok: !!c.signingDate },
      { label: 'Al menos un hito de pago', ok: c.milestones.length > 0 },
      {
        label: 'Hitos de pago suman 100%',
        ok: c.milestones.length > 0 && this.sumaHitos === 100,
        nota: 'No bloquea la generación, pero el contrato saldría con un reparto incompleto.',
      },
    ];
  }

  /** Datos que dependen del usuario (sin el 100%, que no bloquea avanzar). El N° de contrato lo
   *  asigna el backend al crear. */
  get datosListos(): boolean {
    const c = this.contrato;
    return !!c.serviceDescription?.trim() && !!c.signingDate && c.milestones.length > 0;
  }

  generarContrato(): void {
    if (!this.editable || this.saving) return;
    this.saving = true;
    this.loaderService.show();
    this.service.generarContrato(this.contrato.projectContractId).subscribe({
      next: ({ blob, fileName }) => {
        this.descargar(blob, fileName ?? `Contrato-${this.contrato.contractNumber ?? this.contrato.projectContractId}.docx`);
        this.saving = false;
        this.loaderService.hide();
        if (this.estado <= 3) {
          this.documentoGenerado = true;
          this.viewStep = 4;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  private descargar(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Paso 4: envío ──────────────────────────────────────────────────────────

  get puedeEnviar(): boolean {
    return this.puedeEditar && this.estado <= 3;
  }

  /** El backend rechaza el envío (en las dos variantes) si el contrato no tiene hitos. */
  get envioBloqueadoPorHitos(): boolean {
    return this.contrato.milestones.length === 0;
  }

  enviarPorCorreo(): void {
    const email = this.contrato.contractorEmail?.trim();
    if (!this.puedeEnviar || !email || this.envioBloqueadoPorHitos) return;
    this.confirmar(
      '¿Enviar el contrato al contratista?',
      `Se generará el contrato y se enviará adjunto a ${email}.`,
      'Enviar',
    ).then((ok) => ok && this.ejecutarPaso4(false));
  }

  registrarEnvioExterno(): void {
    if (!this.puedeEnviar || this.envioBloqueadoPorHitos) return;
    this.confirmar(
      '¿Registrar el envío como hecho fuera del sistema?',
      'No se enviará ningún correo: solo se marca que el contrato ya se le hizo llegar al contratista.',
      'Registrar',
    ).then((ok) => ok && this.ejecutarPaso4(true));
  }

  private ejecutarPaso4(skipNotification: boolean): void {
    this.ejecutar(this.service.enviarAlContratista(this.contrato.projectContractId, skipNotification), () => {
      this.contrato.contractorNotificationSkipped = skipNotification;
      this.avanzarEstado(4);
      this.viewStep = 5;
    });
  }

  // ── Paso 5: llegada ────────────────────────────────────────────────────────

  get puedeRegistrarLlegada(): boolean {
    return this.puedeEditar && (this.estado === 4 || this.estado === 5);
  }

  get llegadaInvalida(): boolean {
    return (
      this.llegadaConObservaciones === null ||
      (this.llegadaConObservaciones && !this.llegadaObservacion.trim())
    );
  }

  registrarLlegada(): void {
    this.llegadaSubmitted = true;
    if (!this.puedeRegistrarLlegada || this.llegadaInvalida) return;
    const conObs = this.llegadaConObservaciones === true;
    const dto = {
      arrivedWithObservations: conObs,
      arrivalObservation: conObs ? this.llegadaObservacion.trim() : null,
    };
    this.ejecutar(this.service.registrarLlegada(this.contrato.projectContractId, dto), () => {
      this.contrato.arrivedWithObservations = dto.arrivedWithObservations;
      this.contrato.arrivalObservation = dto.arrivalObservation;
      this.avanzarEstado(5);
      this.llegadaSubmitted = false;
      // Con observaciones se queda acá (hay que corregir); sin ellas, a las firmas.
      if (!conObs) this.viewStep = 6;
    });
  }

  // ── Paso 6: firmas ─────────────────────────────────────────────────────────

  get puedeFirmar(): boolean {
    return this.puedeEditar && (this.estado === 5 || this.estado === 6);
  }

  /** Cada firma se guarda al marcarla (se pueden registrar de a una); si falla, se revierte. */
  toggleFirma(key: FirmaKey): void {
    if (!this.puedeFirmar || this.savingFirma) return;
    const dto: ProjectContractStep6SignaturesDTO = {
      step6SignedJefeProyectos: this.contrato.step6SignedJefeProyectos,
      step6SignedGerenteInmobiliario: this.contrato.step6SignedGerenteInmobiliario,
      step6SignedGerenteGeneral: this.contrato.step6SignedGerenteGeneral,
    };
    dto[key] = !dto[key];

    this.savingFirma = key;
    this.service.actualizarFirmas(this.contrato.projectContractId, dto).subscribe({
      next: () => {
        const yaEstabanTodas = this.todasLasFirmas;
        Object.assign(this.contrato, dto);
        if (this.estado < 6) this.avanzarEstado(6);
        this.savingFirma = null;
        // Al completar la tercera firma se pasa directo a subir el escaneo.
        if (!yaEstabanTodas && this.todasLasFirmas) this.viewStep = 7;
      },
      error: (err: HttpErrorResponse) => {
        this.savingFirma = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Paso 7: contrato firmado escaneado ─────────────────────────────────────

  /** El backend acepta el escaneo en estado 6 o 7; además se exigen las 3 firmas, porque es el
   *  contrato YA firmado (el backend no lo valida acá, sí en el paso 8). */
  get puedeEscanear(): boolean {
    return this.puedeEditar && ((this.estado === 6 && this.todasLasFirmas) || this.estado === 7);
  }

  get escaneosSubidos(): ProjectContractScannedDocDTO[] {
    return Object.values(this.escaneos).filter((d): d is ProjectContractScannedDocDTO => !!d);
  }

  onArchivoEscaneo(slot: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file || !this.puedeEscanear || this.subiendoSlot !== null) return;

    this.subiendoSlot = slot;
    this.loaderService.show();
    this.service.subirEscaneo(this.contrato.projectContractId, slot, file).subscribe({
      next: (doc) => {
        this.escaneos = { ...this.escaneos, [slot]: { ...doc, slot } };
        if (this.estado < 7) this.avanzarEstado(7);
        this.subiendoSlot = null;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoSlot = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Pasos 8 y 9 ────────────────────────────────────────────────────────────

  get puedeNotificar(): boolean {
    return this.puedeEditar && this.estado === 7 && this.todasLasFirmas;
  }

  notificar(): void {
    if (!this.puedeNotificar) return;
    this.confirmar(
      '¿Notificar a Unidad de Proyectos?',
      'Se enviará un correo avisando que el contrato ya fue firmado por todas las partes.',
      'Notificar',
    ).then((ok) =>
      ok &&
      this.ejecutar(this.service.notificarUnidadDeProyectos(this.contrato.projectContractId), () => {
        this.avanzarEstado(8);
        this.viewStep = 9;
      }),
    );
  }

  get puedeCerrar(): boolean {
    return this.puedeEditar && this.estado === 8;
  }

  cerrarExpediente(): void {
    if (!this.puedeCerrar) return;
    this.confirmar(
      '¿Cerrar el expediente del contrato?',
      'El contrato quedará como cerrado y ya no tendrá acciones pendientes.',
      'Cerrar expediente',
    ).then((ok) => ok && this.ejecutar(this.service.cerrar(this.contrato.projectContractId), () => this.avanzarEstado(9)));
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private confirmar(title: string, text: string, confirmButtonText: string): Promise<boolean> {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then((r) => r.isConfirmed);
  }

  /** Corre una mutación que devuelve `{ message }`, aplica el cambio local y muestra el mensaje. */
  private ejecutar(obs: ReturnType<ContratosService['cerrar']>, alTerminar: () => void): void {
    if (this.saving) return;
    this.saving = true;
    this.loaderService.show();
    obs.subscribe({
      next: (res) => {
        alTerminar();
        this.saving = false;
        this.loaderService.hide();
        swalUdpSuccess(res.message);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }
}
