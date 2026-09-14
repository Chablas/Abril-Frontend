import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AccessRoles } from '../../../../shared/components/access-roles/access-roles';
import { AccessUsers } from '../../../../shared/components/access-users/access-users';
import { FuncionalidadesService } from '../../services/funcionalidades.service';
import { FuncionalidadDetalleDto, FuncionalidadRow } from '../../dtos/funcionalidad.dto';

/**
 * Detalle de una funcionalidad: qué roles la tienen y qué usuarios acceden por ellos, cada uno con
 * los roles que se la dan. Solo lectura.
 */
@Component({
  selector: 'app-funcionalidad-detalle-modal',
  standalone: true,
  imports: [CommonModule, BaseModal, AccessRoles, AccessUsers],
  templateUrl: './funcionalidad-detalle-modal.html',
})
export class FuncionalidadDetalleModal implements OnInit {
  /** La fila de la tabla: pone el título y el módulo al toque, mientras llega el detalle. */
  @Input({ required: true }) funcionalidad!: FuncionalidadRow;
  @Output() closeModal = new EventEmitter<void>();

  detalle: FuncionalidadDetalleDto | null = null;

  constructor(
    private service: FuncionalidadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDetalle(this.funcionalidad.featureId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }
}
