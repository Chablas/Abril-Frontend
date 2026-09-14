import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AccessUsers } from '../../../../shared/components/access-users/access-users';
import { AccessFeatures } from '../../../../shared/components/access-features/access-features';
import { RoleFeatureService } from '../../services/role.service';
import { RoleDto } from '../../dtos/role.model';
import { RoleDetailDto } from '../../dtos/role-detail.model';

/** Detalle de un rol: qué usuarios lo tienen y qué funcionalidades da. Solo lectura. */
@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [CommonModule, BaseModal, AccessUsers, AccessFeatures],
  templateUrl: './role-detail.html',
})
export class RoleDetail implements OnInit {
  /** La fila de la tabla: pone el título al toque, mientras llega el detalle. */
  @Input({ required: true }) role!: RoleDto;
  @Output() closeModal = new EventEmitter<void>();

  detalle: RoleDetailDto | null = null;

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.roleService.getRoleDetail(this.role.roleId).subscribe({
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
