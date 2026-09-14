import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { UserListItemDto } from '../../../../../../core/dtos/user/userListItem.model';
import { AccessRoles } from '../../../../shared/components/access-roles/access-roles';
import { AccessFeatures } from '../../../../shared/components/access-features/access-features';
import { UserFeatureService } from '../../services/user-feature.service';
import { UserDetailDto } from '../../dtos/user-detail.dto';
import { userTypeBadgeClass } from '../../utils/user-type-badge';

/** Lo que muestra la cabecera: sale de la fila de la tabla hasta que llega el detalle. */
type CabeceraUsuario = Pick<UserListItemDto, 'email' | 'userType' | 'active'> & {
  displayName?: string | null;
  documentIdentityCode?: string | null;
};

/** Detalle de un usuario: sus roles y las funcionalidades a las que accede por ellos. Solo lectura. */
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, BaseModal, AccessRoles, AccessFeatures],
  templateUrl: './user-detail.html',
})
export class UserDetail implements OnInit {
  /** La fila de la tabla: pone la cabecera al toque, mientras llega el detalle. */
  @Input({ required: true }) user!: UserListItemDto;
  @Output() closeModal = new EventEmitter<void>();

  detalle: UserDetailDto | null = null;

  private readonly titleCase = new TitleCasePipe();

  constructor(
    private userFeatureService: UserFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.userFeatureService.getUserDetail(this.user.userId).subscribe({
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

  get cabecera(): CabeceraUsuario {
    return this.detalle ?? this.user;
  }

  /** person.full_name viene en MAYÚSCULAS; sin person, el usuario se reconoce por su correo. */
  get titulo(): string {
    const c = this.cabecera;
    return c.displayName ? this.titleCase.transform(c.displayName) : c.email;
  }

  get subtitulo(): string {
    const c = this.cabecera;
    return [c.displayName ? c.email : null, c.documentIdentityCode ? `DNI ${c.documentIdentityCode}` : null]
      .filter((parte): parte is string => !!parte)
      .join(' · ');
  }

  get tipoBadge(): string {
    return userTypeBadgeClass(this.cabecera.userType);
  }
}
