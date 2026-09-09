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
import { GestionRendicionesService } from '../../services/gestion-rendiciones.service';
import {
  GestionRendicionDetalleDto,
  ReembolsoAccionDto,
} from '../../dtos/gestion-rendicion.dto';
import {
  primeraRevisionColors,
  reembolsoColors,
} from '../../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';

/**
 * Detalle de una planilla para el revisor: sus documentos y las salidas que agrupa.
 *
 * Los DOS momentos de decisión son de la planilla entera —la primera revisión y el reembolso—, así
 * que sus botones van al pie del modal y la tabla de salidas es solo lectura. El reembolso se
 * decidía salida por salida con checkboxes; ya no: lo que se revisa es un documento (la planilla,
 * su Consolidado del S10) y aprobar media planilla dejaba al trabajador con un reembolso partido.
 * Además la subsanación ya era por planilla —volver a adjuntar el consolidado reabre TODAS sus
 * salidas rechazadas—, así que decidir por partes nunca tuvo una vuelta atrás a la misma
 * granularidad.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-rendicion-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe, FirmaRegistrarModal],
  templateUrl: './gestion-rendicion-detalle-modal.html',
})
export class GestionRendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: GestionRendicionDetalleDto | null = null;

  /** Modal para dibujar la firma en el momento. Lo abre el 409 de aprobar. */
  firmaModalAbierto = false;

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

  // ── Reembolso (por planilla: el revisor decide el documento entero) ───

  /**
   * La decisión va por `rendicionIds`: el backend resuelve las salidas de la planilla que están
   * dentro del alcance del revisor y se queda solo con las que tienen el reembolso por decidir —
   * las ya decididas las ignora en silencio, así que reaprobar no las pisa.
   */
  private accion(observacion?: string): ReembolsoAccionDto {
    return {
      rendicionIds: this.detalle ? [this.detalle.id] : [],
      solicitudIds: [],
      observacion: observacion ?? null,
    };
  }

  async aprobar(): Promise<void> {
    const d = this.detalle;
    if (!d || d.porDecidirCount === 0 || !d.puedeDecidir) return;

    const result = await confirmarConCorreos({
      titulo: '¿Aprobar el reembolso de ' + d.codigo + '?',
      // Lo único que el modal no muestra: que aprobar ES firmar los dos documentos.
      nota: 'Se firma la planilla y su Consolidado del S10.',
      avisos: await this.avisos('REEMBOLSO', true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    this.ejecutarAprobacion();
  }

  /**
   * A quién le va a llegar el aviso de la decisión. Lo resuelve el backend con el MISMO cálculo
   * que hace el envío (Configuración → Correos), así que la confirmación no promete un correo a
   * alguien que la configuración dejó fuera ni dice que no le llega a nadie cuando sí está activo.
   *
   * Se pide al apretar el botón y no al abrir el detalle: son cuatro decisiones con cuatro correos
   * distintos y resolver las cuatro cada vez que se abre el modal es trabajo que casi nunca se usa.
   */
  private avisos(accion: 'PRIMERA_REVISION' | 'REEMBOLSO', aprobar: boolean) {
    return pedirAvisos(this.service.correoPreview({
      rendicionIds: [this.detalle!.id],
      accion,
      aprobar,
    }));
  }

  /**
   * Aprueba, que es lo mismo que firmar. El 409 significa que el revisor todavía no registró su
   * firma: en vez de mandarlo a Configuración se abre el modal donde la dibuja y la aprobación se
   * reintenta sola.
   */
  private ejecutarAprobacion(): void {
    this.loader.show();
    this.service.aprobarReembolso(this.accion()).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        if (err.status === 409) {
          this.firmaModalAbierto = true;
          this.cdr.detectChanges();
          return;
        }
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

  async rechazar(): Promise<void> {
    const d = this.detalle;
    if (!d || d.porDecidirCount === 0 || !d.puedeDecidir) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: '¿Rechazar el reembolso de ' + d.codigo + '?',
      avisos: await this.avisos('REEMBOLSO', false),
      observacion: { label: 'Observación', placeholder: 'Qué tiene que corregir el trabajador…' },
      confirmButtonText: 'Rechazar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loader.show();
    this.service.rechazarReembolso(this.accion(observacion)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
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
      nota: 'Habilita al trabajador a cargar el Consolidado del S10.',
      avisos: await this.avisos('PRIMERA_REVISION', true),
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
      avisos: await this.avisos('PRIMERA_REVISION', false),
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

  // ── Presentación ─────────────────────────────────────────────────────

  readonly primeraRevisionColors = primeraRevisionColors;
  readonly reembolsoColors = reembolsoColors;

  reembolsoTexto(estado: string): string {
    return estado === 'Rechazado' ? 'Observado' : estado;
  }
}
