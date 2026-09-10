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
 * Detalle de una corrección del S10 para el Coordinador ERP: la guía con la que ubica el registro,
 * qué observó la jefatura, qué le pide el colaborador y los dos PDF para contrastar.
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
   * El check de confirmación (RG-22): la corrección ya se hizo en el S10. Se pregunta aparte si el
   * registro se ANULÓ, porque eso cambia lo que el colaborador tiene que hacer después — con una
   * anulación necesita una guía nueva y la anterior queda bloqueada al recargar el consolidado.
   */
  async atender(): Promise<void> {
    const d = this.detalle;
    if (!d?.porAtender) return;

    const { value, isConfirmed } = await Swal.fire<{ anulada: boolean; comentario: string }>({
      icon: 'question',
      title: '¿Marcar como atendida?',
      html: `
        <div style="text-align:left;color:#4B5563">
          <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;margin-bottom:10px">
            <input type="checkbox" id="ga-guia-anulada" style="margin-top:3px;accent-color:#C2410C">
            <span>
              El registro del S10 se <b>anul&oacute;</b>: hace falta una gu&iacute;a nueva.
              ${d.numeroGuia ? `<br><span style="font-size:12px;color:#6B7280">Gu&iacute;a actual: ${d.numeroGuia}</span>` : ''}
            </span>
          </label>
          <label for="ga-comentario" style="display:block;font-size:13px;margin-bottom:4px">
            Comentario (opcional)
          </label>
          <textarea id="ga-comentario" class="swal2-textarea" style="margin:0;width:100%"
                    placeholder="Qu&eacute; hiciste en el S10&hellip;"></textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como atendida',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
      preConfirm: () => ({
        anulada: (document.getElementById('ga-guia-anulada') as HTMLInputElement)?.checked ?? false,
        comentario: (document.getElementById('ga-comentario') as HTMLTextAreaElement)?.value ?? '',
      }),
    });
    if (!isConfirmed || !value) return;

    // El preview va después del formulario: el diálogo anterior ya pide dos datos y meterle
    // además la lista de correos lo volvía ilegible.
    const avisos = await pedirAvisos(this.service.correoPreview([d.id]));
    const { isConfirmed: confirmado } = await confirmarConCorreos({
      titulo: 'Confirmar',
      avisos,
      sinNadie: 'Se marca igual, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Confirmar',
    });
    if (!confirmado) return;

    this.loader.show();
    this.service.atender({
      correccionIds: [d.id],
      comentarioAtencion: value.comentario?.trim() || null,
      guiaAnulada: value.anulada,
    }).subscribe({
      next: (res) => {
        this.loader.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2600, showConfirmButton: false });
        // Se cierra: la pelota pasó al colaborador y ya no hay nada que hacerle desde acá.
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
