import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { FirmaRegistrarModal } from '../../../../../../shared/components/firma-personal/registrar-modal/firma-registrar-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { FirmaMfaService } from '../../../../../../core/services/firma-mfa.service';
import { ConsolidadosService } from '../../services/consolidados.service';
import { ConsolidadoDetalleDto, ConsolidadoSalidaDto } from '../../dtos/consolidado.dto';
import {
  correccionS10Colors,
  reembolsoColors,
  reembolsoLabelCorto,
} from '../../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';
import { nombreConsolidado } from '../../../../shared/consolidado-nombre';
import { SalidaDetalleModal } from '../../../../shared/components/salida-detalle-modal/salida-detalle-modal';
import { ConsolidadoS10Modal } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { DocumentoEmbebido } from '../../../../shared/components/documento-embebido/documento-embebido';
import { ReembolsoPipeline } from '../../../../shared/components/reembolso-pipeline/reembolso-pipeline';
import * as tramites from '../tramites-consolidador';

/**
 * Detalle de un Consolidado del S10: el documento, las planillas que cubre y las salidas de cada
 * una —con su ojo para ver trayectos, capturas y montos—, para que la jefatura vea qué gasto está
 * por firmar.
 *
 * La decisión es del documento entero —cubre todas esas planillas— así que sus dos botones van al
 * pie del modal y las tablas son solo lectura. Al pie van también los trámites del consolidador:
 * avisar a la jefatura, pedir la corrección al ERP y reemplazar el consolidado, que se hace acá
 * mismo (Gestión de Rendiciones solo adjunta el primero).
 */
@Component({
  standalone: true,
  selector: 'app-consolidado-detalle-modal',
  imports: [
    CommonModule, BaseModal, StatusBadge, TitleCasePipe, FirmaRegistrarModal, SalidaDetalleModal,
    ConsolidadoS10Modal, DocumentoEmbebido, ReembolsoPipeline,
  ],
  templateUrl: './consolidado-detalle-modal.html',
})
export class ConsolidadoDetalleModal implements OnInit {
  @Input({ required: true }) consolidadoId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: ConsolidadoDetalleDto | null = null;

  /** Modal para dibujar la firma en el momento. Lo abre el 409 de aprobar. */
  firmaModalAbierto = false;

  /** Salida cuyo detalle (el ojo de la tabla) está abierto. null = cerrado. */
  salidaId: number | null = null;

  /** El detalle de la salida en consulta, con el endpoint y el alcance de esta pantalla. */
  readonly cargarSalida = (id: number) => this.service.getSalidaDetalle(id);

  private huboCambios = false;

  constructor(
    private service: ConsolidadosService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private firmaMfa: FirmaMfaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.consolidadoId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.huboCambios);
      },
    });
  }

  cerrar(): void {
    this.close.emit(this.huboCambios);
  }

  /** "CONS-GTH-2026-001 · N.° 12345": los dos nombres del documento, el nuestro y el del S10. */
  get titulo(): string {
    return nombreConsolidado(this.detalle);
  }

  // ── Decisión del reembolso (de la jefatura, sobre el documento entero) ──

  private accion(observacion?: string) {
    return { consolidadoIds: [this.consolidadoId], observacion: observacion ?? null };
  }

  /**
   * A quién le va a llegar el aviso de la decisión. Lo resuelve el backend con el MISMO cálculo que
   * hace el envío (Configuración → Correos), así que la confirmación no promete un correo a alguien
   * que la configuración dejó fuera ni dice que no le llega a nadie cuando sí está activo.
   */
  private avisos(aprobar: boolean) {
    return pedirAvisos(this.service.correoPreview({
      consolidadoIds: [this.consolidadoId],
      aprobar,
    }));
  }

  /**
   * Puede aprobar (que es firmar) HOY: le toca decidir, todavía no firmó y no está esperando a
   * quien va antes que él. Un consolidado de obra lo firman DOS —el administrador y detrás el
   * residente—, así que «ya firmé» no es «ya está aprobado»: con una sola firma el documento sigue
   * esperando, y volver a apretar Aprobar no lo completa.
   */
  get puedeAprobar(): boolean {
    const d = this.detalle;
    return !!d && d.porDecidirCount > 0 && !d.yaFirme && !d.esperaFirmaPrevia;
  }

  /**
   * Las firmas que faltan, sin contar la propia: cuando le toca firmar y no lo hizo, él mismo
   * encabeza la lista, y nombrarse ahí se lee como si el documento estuviera esperando a otro.
   * Vacío cuando el único que falta es él (ahí habla el botón «Aprobar el consolidado»).
   */
  get firmasFaltantesTexto(): string {
    const d = this.detalle;
    if (!d?.firmasPendientes.length) return '';
    return (this.puedeAprobar ? d.firmasPendientes.slice(1) : d.firmasPendientes).join(', ');
  }

  async aprobar(): Promise<void> {
    if (!this.puedeAprobar) return;
    const d = this.detalle!;

    // Con dos firmas, la primera no cierra nada: decirlo evita que el jefe crea que el consolidado
    // ya pasó a Tesorería.
    const despues = d.firmasPendientes.slice(1);
    const result = await confirmarConCorreos({
      titulo: '¿Aprobar este consolidado?',
      // Lo único que el modal no muestra: que aprobar ES firmar todos esos documentos.
      nota: 'Firma el consolidado, la planilla grupal y sus planillas.'
          + (despues.length ? ` Después falta la firma de ${despues.join(', ')}.` : ''),
      avisos: await this.avisos(true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    this.ejecutarAprobacion();
  }

  /**
   * Vuelve a estampar su firma sobre un consolidado que ya firmó. No es una segunda firma: la copia
   * firmada se rehace desde el original con la suya al día, así que el documento sigue esperando
   * exactamente lo que esperaba. Solo se ofrece mientras el que viene detrás no haya firmado.
   */
  async volverAFirmar(): Promise<void> {
    const d = this.detalle;
    if (!d?.puedeVolverAFirmar) return;

    const result = await confirmarConCorreos({
      titulo: '¿Volver a firmar este consolidado?',
      nota: 'Reemplaza tu firma con la fecha de hoy.'
          + (d.firmasPendientes.length
              ? ` Sigue faltando la firma de ${d.firmasPendientes.join(', ')}.`
              : ''),
      avisos: [],
      sinNadie: 'No sale ningún correo.',
      confirmButtonText: 'Sí, volver a firmar',
    });
    if (!result.isConfirmed) return;

    const firmaMfa = await this.firmaMfa.obtener();
    if (firmaMfa === null) return;

    this.loader.show();
    this.service.volverAFirmar(this.accion(), firmaMfa).subscribe({
      next: (res) => {
        this.loader.hide();
        Swal.fire({ title: res.message, icon: 'success', timer: 1800, showConfirmButton: false });
        // No se decidió nada: el modal se queda abierto con el documento nuevo a la vista.
        this.trasTramite();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        if (this.firmaMfa.avisarSiFalto(err, firmaMfa)) return;
        this.errorAccion(err);
      },
    });
  }

  /**
   * Aprueba, que es lo mismo que firmar. El 409 significa que la jefatura todavía no registró su
   * firma: en vez de mandarla a Configuración se abre el modal donde la dibuja y la aprobación se
   * reintenta sola.
   */
  private async ejecutarAprobacion(): Promise<void> {
    // Firmar pide la verificación de Microsoft; el reintento tras registrar la firma reusa la misma.
    const firmaMfa = await this.firmaMfa.obtener();
    if (firmaMfa === null) return;

    this.loader.show();
    this.service.aprobarReembolso(this.accion(), firmaMfa).subscribe({
      next: (res) => this.trasDecision(res.message),
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        if (err.status === 409) {
          this.firmaModalAbierto = true;
          this.cdr.detectChanges();
          return;
        }
        if (this.firmaMfa.avisarSiFalto(err, firmaMfa)) return;
        this.errorAccion(err);
      },
    });
  }

  onFirmaRegistrada(): void {
    this.firmaModalAbierto = false;
    this.ejecutarAprobacion();
  }

  cerrarFirmaModal(): void {
    this.firmaModalAbierto = false;
    this.cdr.detectChanges();
  }

  async observar(): Promise<void> {
    const d = this.detalle;
    if (!d || d.porDecidirCount === 0) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: '¿Observar este consolidado?',
      avisos: await this.avisos(false),
      observacion: {
        label: 'Observación',
        placeholder: 'Qué tiene que corregir el consolidador en el Consolidado del S10…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loader.show();
    this.service.observarReembolso(this.accion(observacion)).subscribe({
      next: (res) => this.trasDecision(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  private trasDecision(message: string): void {
    this.loader.hide();
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    // Decidido el reembolso ya no queda nada que hacer acá: se cierra y la tabla se recarga.
    this.close.emit(true);
  }

  private errorAccion(err: HttpErrorResponse): void {
    this.loader.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  // ── Trámites del consolidador ────────────────────────────────────────
  // Después de cada uno el detalle se recarga y queda abierto: lo que cambia (la fecha del aviso,
  // la corrección en curso) se lee acá mismo.

  private get tramitesDeps() {
    return { service: this.service, loader: this.loader, errorService: this.errorService };
  }

  async avisarJefatura(): Promise<void> {
    if (!this.detalle) return;
    if (await tramites.avisarJefatura(this.tramitesDeps, this.detalle)) this.trasTramite();
  }

  async solicitarCorreccion(): Promise<void> {
    if (!this.detalle) return;
    if (await tramites.solicitarCorreccionErp(this.tramitesDeps, this.detalle)) this.trasTramite();
  }

  private trasTramite(): void {
    this.huboCambios = true;
    this.cargar();
  }

  // ── Reemplazo del consolidado ────────────────────────────────────────
  // Se reemplaza ACÁ y en ningún otro lado: Gestión de Rendiciones solo adjunta el primero. El
  // documento nuevo cubre las planillas que siguen con el reembolso abierto; las ya decididas se
  // quedan con el actual, que es el que se firmó.

  /** Lo que va a cubrir el consolidado de reemplazo. null = modal cerrado. */
  reemplazo: {
    actual: ConsolidadoS10Dto;
    codigos: string[];
    monto: number;
    referencia: string | null;
  } | null = null;

  abrirReemplazo(): void {
    const d = this.detalle;
    if (!d?.puedeReemplazar) return;

    const abiertas = d.rendiciones.filter((r) => r.reembolsoAbierto);
    const una = abiertas.length === 1 ? abiertas[0] : null;

    this.reemplazo = {
      // El modal solo muestra el archivo, el monto, el número y la fecha del documento actual.
      actual: {
        id: d.id,
        codigo: d.codigo,
        ambito: 'Rendicion',
        pdfUrl: d.pdfUrl,
        pdfFilename: d.pdfFilename,
        montoTotal: d.montoTotal,
        numeroReembolso: d.numeroReembolso,
        planillaGrupalUrl: d.planillaGrupalUrl,
        planillaGrupalFilename: d.planillaGrupalFilename,
        planillaGrupalFirmadoUrl: d.planillaGrupalFirmadoUrl,
        planillaGrupalFirmadoFilename: d.planillaGrupalFirmadoFilename,
        pdfFirmadoUrl: d.pdfFirmadoUrl,
        pdfFirmadoFilename: d.pdfFirmadoFilename,
        firmadoAt: d.firmadoAt,
        uploadedAt: d.uploadedAt,
        rendiciones: d.rendiciones.map((r) => ({ id: r.id, codigo: r.codigo })),
      },
      codigos: abiertas.map((r) => r.codigo),
      monto: abiertas.reduce((acc, r) => acc + r.montoTotalPlanilla, 0),
      referencia: una ? (una.numeroPlanilla ?? una.codigo) : null,
    };
  }

  readonly subirReemplazo = (file: File, montoTotal: number, numeroReembolso: string) =>
    this.service.reemplazarConsolidado(this.consolidadoId, file, montoTotal, numeroReembolso);

  /** A quién le llega el aviso que dispara reemplazar: la jefatura de esas planillas. */
  readonly avisosReemplazo = () =>
    this.service.correoPreview({
      consolidadoIds: [this.consolidadoId],
      aprobar: true,
      accion: 'REEMPLAZO',
    });

  cerrarReemplazo(subido: ConsolidadoS10Dto | null): void {
    this.reemplazo = null;
    if (subido) {
      // El documento reemplazado se da de baja y el nuevo es otra fila: este detalle ya no existe.
      this.close.emit(true);
    } else {
      this.cdr.detectChanges();
    }
  }

  // ── Detalle de una salida ────────────────────────────────────────────

  verSalida(solicitudId: number): void {
    this.salidaId = solicitudId;
  }

  cerrarSalida(): void {
    this.salidaId = null;
    this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;
  readonly correccionS10Colors = correccionS10Colors;

  /** Salidas de una planilla: el detalle las trae todas juntas y se agrupan por documento. */
  salidasDe(rendicionId: number): ConsolidadoSalidaDto[] {
    return this.detalle?.salidas.filter((s) => s.rendicionId === rendicionId) ?? [];
  }
}
