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
import { ConsolidadosService } from '../../services/consolidados.service';
import { ConsolidadoDetalleDto, ConsolidadoSalidaDto } from '../../dtos/consolidado.dto';
import { reembolsoColors, reembolsoLabelCorto } from '../../../../shared/dtos/rendicion-shared.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';

/**
 * Detalle de un Consolidado del S10: el documento, las planillas que cubre y las salidas de cada
 * una, para que la jefatura vea qué gasto está por firmar.
 *
 * La decisión es del documento entero —cubre todas esas planillas— así que sus dos botones van al
 * pie del modal y las tablas son solo lectura: aprobar media planilla dejaba al trabajador con un
 * reembolso partido, y la subsanación (volver a adjuntar el consolidado) siempre fue del documento
 * completo.
 */
@Component({
  standalone: true,
  selector: 'app-consolidado-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe, FirmaRegistrarModal],
  templateUrl: './consolidado-detalle-modal.html',
})
export class ConsolidadoDetalleModal implements OnInit {
  @Input({ required: true }) consolidadoId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: ConsolidadoDetalleDto | null = null;

  /** Modal para dibujar la firma en el momento. Lo abre el 409 de aprobar. */
  firmaModalAbierto = false;

  private huboCambios = false;

  constructor(
    private service: ConsolidadosService,
    private loader: LoaderService,
    private errorService: ErrorService,
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

  get titulo(): string {
    const numero = this.detalle?.numeroReembolso;
    return numero ? 'Consolidado del S10 N.° ' + numero : 'Consolidado del S10';
  }

  // ── Decisión del reembolso (del documento entero) ────────────────────

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

  async aprobar(): Promise<void> {
    const d = this.detalle;
    if (!d || d.porDecidirCount === 0 || !d.puedeDecidir) return;

    const result = await confirmarConCorreos({
      titulo: '¿Aprobar el reembolso de este consolidado?',
      // Lo único que el modal no muestra: que aprobar ES firmar todos esos documentos.
      nota: 'Se firma el Consolidado del S10 y las planillas que cubre.',
      avisos: await this.avisos(true),
      confirmButtonText: 'Sí, aprobar',
    });
    if (!result.isConfirmed) return;

    this.ejecutarAprobacion();
  }

  /**
   * Aprueba, que es lo mismo que firmar. El 409 significa que la jefatura todavía no registró su
   * firma: en vez de mandarla a Configuración se abre el modal donde la dibuja y la aprobación se
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

  async observar(): Promise<void> {
    const d = this.detalle;
    if (!d || d.porDecidirCount === 0 || !d.puedeDecidir) return;

    const { value: observacion, isConfirmed } = await confirmarConCorreos({
      icon: 'warning',
      titulo: '¿Observar el reembolso de este consolidado?',
      avisos: await this.avisos(false),
      observacion: {
        label: 'Observación',
        placeholder: 'Qué tiene que corregir el trabajador en el Consolidado del S10…',
      },
      confirmButtonText: 'Observar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loader.show();
    this.service.observarReembolso(this.accion(observacion)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  private trasAccion(message: string): void {
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

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;
  readonly reembolsoLabelCorto = reembolsoLabelCorto;

  /** Salidas de una planilla: el detalle las trae todas juntas y se agrupan por documento. */
  salidasDe(rendicionId: number): ConsolidadoSalidaDto[] {
    return this.detalle?.salidas.filter((s) => s.rendicionId === rendicionId) ?? [];
  }
}
