import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GestionRendicionesService } from '../../services/gestion-rendiciones.service';
import { GestionRendicionDetalleDto } from '../../dtos/gestion-rendicion.dto';
import {
  primeraRevisionColors,
  reembolsoColors,
} from '../../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';
import { otrasRendicionesDelConsolidado } from '../../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { SalidaDetalleModal } from '../../../../shared/components/salida-detalle-modal/salida-detalle-modal';
import { DocumentoEmbebido } from '../../../../shared/components/documento-embebido/documento-embebido';
import { ReembolsoPipeline } from '../../../../shared/components/reembolso-pipeline/reembolso-pipeline';

/**
 * Detalle de una planilla para la jefatura y el consolidador: sus documentos y las salidas que
 * agrupa, cada una con su ojo para ver trayectos, capturas y montos.
 *
 * La decisión de la primera revisión es de la planilla entera, así que sus botones van al pie del
 * modal y la tabla de salidas es solo lectura: lo que se revisa es un documento, y aprobar media
 * planilla dejaría al trabajador con una rendición partida. Al pie va también el Consolidado del S10
 * para el consolidador; el modal solo emite y la pantalla lo abre con el mismo camino que el botón
 * de la fila. El reembolso ya no se decide acá: se decide en Consolidados.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-rendicion-detalle-modal',
  imports: [
    CommonModule, BaseModal, StatusBadge, TitleCasePipe, SalidaDetalleModal, DocumentoEmbebido,
    ReembolsoPipeline,
  ],
  templateUrl: './gestion-rendicion-detalle-modal.html',
})
export class GestionRendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  /**
   * "Consolidado S10" desde el pie del detalle. Solo avisa: la pantalla abre el mismo modal que el
   * botón de la fila, con la planilla y su conjunto.
   */
  @Output() consolidar = new EventEmitter<GestionRendicionDetalleDto>();

  detalle: GestionRendicionDetalleDto | null = null;

  /** Salida cuyo detalle (el ojo de la tabla) está abierto. null = cerrado. */
  salidaId: number | null = null;

  /** El detalle de la salida en consulta, con el endpoint y el alcance de esta pantalla. */
  readonly cargarSalida = (id: number) => this.service.getSalidaDetalle(id);

  private huboCambios = false;

  constructor(
    private service: GestionRendicionesService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
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
        this.close.emit(this.huboCambios);
      },
    });
  }

  cerrar(): void {
    this.close.emit(this.huboCambios);
  }

  /**
   * A quién le va a llegar el aviso de la decisión. Lo resuelve el backend con el MISMO cálculo
   * que hace el envío (Configuración → Correos), así que la confirmación no promete un correo a
   * alguien que la configuración dejó fuera ni dice que no le llega a nadie cuando sí está activo.
   *
   * Se pide al apretar el botón y no al abrir el detalle: son dos decisiones con dos correos
   * distintos y resolver los dos cada vez que se abre el modal es trabajo que casi nunca se usa.
   */
  private avisos(aprobar: boolean) {
    return pedirAvisos(this.service.correoPreview({
      rendicionIds: [this.detalle!.id],
      aprobar,
    }));
  }

  private trasAccion(message: string): void {
    this.loader.hide();
    this.huboCambios = true;
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    this.cargar();
  }

  private errorAccion(err: HttpErrorResponse): void {
    this.loader.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  // ── Primera revisión (por planilla: es el documento lo que se revisa) ──

  async aprobarPrimeraRevision(): Promise<void> {
    const d = this.detalle;
    if (!d?.porPrimeraRevision) return;

    const result = await confirmarConCorreos({
      titulo: '¿Aprobar la rendición ' + d.codigo + '?',
      nota: 'Habilita al consolidador a cargar el Consolidado del S10.',
      avisos: await this.avisos(true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    this.loader.show();
    this.service.aprobarPrimeraRevision({ rendicionIds: [d.id] }).subscribe({
      next: (res) => this.trasDecisionPrimeraRevision(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  async observarPrimeraRevision(): Promise<void> {
    const d = this.detalle;
    if (!d?.porPrimeraRevision) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: '¿Observar la rendición ' + d.codigo + '?',
      avisos: await this.avisos(false),
      observacion: {
        label: 'Observación',
        placeholder: 'Qué capturas o montos tiene que corregir el trabajador…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loader.show();
    this.service.observarPrimeraRevision({ rendicionIds: [d.id], observacion }).subscribe({
      next: (res) => this.trasDecisionPrimeraRevision(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  /** Cierra el modal: decidida la primera revisión, ya no hay nada que mirar en este detalle. */
  private trasDecisionPrimeraRevision(message: string): void {
    this.loader.hide();
    Swal.fire({ title: message, icon: 'success', timer: 2000, showConfirmButton: false });
    this.close.emit(true);
  }

  // ── Consolidado del S10 (consolidador) ───────────────────────────────

  consolidarDesdeDetalle(): void {
    const d = this.detalle;
    if (!d?.puedeAdjuntarConsolidado || !d.puedeConsolidar) return;
    this.consolidar.emit(d);
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

  readonly primeraRevisionColors = primeraRevisionColors;
  readonly reembolsoColors = reembolsoColors;

  reembolsoTexto(estado: string): string {
    return estado;
  }

  /** Con qué otras rendiciones comparte el Consolidado del S10 (vacío si es solo suyo). */
  otrasDelConsolidado(d: GestionRendicionDetalleDto): string[] {
    return otrasRendicionesDelConsolidado(d.consolidadoS10, d.id);
  }
}
