import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ReembolsosService } from '../../services/reembolsos.service';
import { ReembolsoDetalleDto } from '../../dtos/reembolso.dto';
import { reembolsoColors } from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * Desglose de una planilla para Tesorería: qué se está pagando y a quién, antes de marcarla.
 * Es de solo lectura — el pago se ejecuta desde la tabla, sobre la selección.
 */
@Component({
  standalone: true,
  selector: 'app-reembolso-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe],
  templateUrl: './reembolso-detalle-modal.html',
})
export class ReembolsoDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;
  @Output() close = new EventEmitter<void>();

  detalle: ReembolsoDetalleDto | null = null;

  constructor(
    private service: ReembolsosService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
        this.close.emit();
      },
    });
  }

  cerrar(): void {
    this.close.emit();
  }

  readonly reembolsoColors = reembolsoColors;
}
