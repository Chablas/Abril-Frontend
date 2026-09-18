import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CorreccionesS10Service } from '../../services/correcciones-s10.service';
import { CorreccionS10ListItemDto } from '../../dtos/correccion-s10.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../../shared/confirmar-correos';
import { correccionS10Colors } from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * Detalle de una corrección del S10 para el Coordinador ERP: el número de reembolso con el que ubica el registro,
 * qué observó la jefatura, qué le pide el consolidador y los dos PDF para contrastar.
 *
 * Trae también el check de atención porque el correo abre directo acá: si el botón viviera solo en
 * la tabla, el enlace del correo dejaría al Coordinador mirando sin poder resolver.
 */
@Component({
  standalone: true,
  selector: 'app-correccion-s10-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './correccion-s10-detalle-modal.html',
})
export class CorreccionS10DetalleModal implements OnInit {
  @Input({ required: true }) correccionId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: CorreccionS10ListItemDto | null = null;

  private huboCambios = false;

  constructor(
    private service: CorreccionesS10Service,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.correccionId).subscribe({
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
   * El check de confirmación (RG-22): la corrección ya se hizo en el S10, y el consolidador queda
   * avisado para recargar el consolidado. Lo único que se pide es un comentario opcional, así que
   * va en la MISMA confirmación que los correos.
   */
  async atender(): Promise<void> {
    const d = this.detalle;
    if (!d?.porAtender) return;

    const { isConfirmed, value } = await confirmarConCorreos({
      titulo: '¿Marcar como atendida?',
      avisos: await pedirAvisos(this.service.correoPreview([d.id])),
      sinNadie: 'Se marca igual, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Sí, marcar como atendida',
      observacion: {
        label: 'Comentario (opcional)',
        placeholder: 'Qué hiciste en el S10…',
        obligatoria: false,
      },
    });
    if (!isConfirmed) return;

    this.loader.show();
    this.service.atender({
      correccionIds: [d.id],
      comentarioAtencion: (value as string)?.trim() || null,
    }).subscribe({
      next: (res) => {
        this.loader.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2600, showConfirmButton: false });
        // Se cierra: la pelota pasó al consolidador y ya no hay nada que hacerle desde acá.
        this.close.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  readonly correccionS10Colors = correccionS10Colors;
}
