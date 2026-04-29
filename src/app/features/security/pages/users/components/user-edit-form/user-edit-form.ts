import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../../../core/services/user.service';
import { RoleService } from '../../../../../../core/services/role.service';
import { UserDTO } from '../../../../../../core/dtos/user/user.model';
import { UserUpdateDTO } from '../../../../../../core/dtos/user/userUpdate.model';
import { RoleSimpleDTO } from '../../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './user-edit-form.html',
  styleUrl: './user-edit-form.css',
})
export class UserEditForm implements OnInit {
  @Input() open = false;
  @Input() initial: UserDTO | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: UserUpdateDTO = this.empty();
  saving = false;
  roles: RoleSimpleDTO[] = [];

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.reset();
    this.loadRoles();
  }

  private empty(): UserUpdateDTO {
    return { firstNames: '', firstLastName: '', secondLastName: '', email: '', phoneNumber: 0, roleId: 0 };
  }

  private reset(): void {
    this.model = {
      firstNames: '',
      firstLastName: '',
      secondLastName: '',
      email: this.initial?.person?.email ?? '',
      phoneNumber: 0,
      roleId: this.initial?.roles?.[0]?.roleId ?? 0,
    };
  }

  private loadRoles(): void {
    this.loaderService.show();
    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get title(): string {
    return 'EDITAR USUARIO';
  }

  get canSubmit(): boolean {
    return (
      !!this.model.firstNames.trim() &&
      !!this.model.firstLastName.trim() &&
      !!this.model.email.trim() &&
      this.model.roleId > 0 &&
      !this.saving
    );
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'Completa los campos requeridos' });
      return;
    }
    if (!this.initial) return;

    this.saving = true;
    this.loaderService.show();
    this.userService
      .updateUser(this.initial.userId, {
        firstNames: this.model.firstNames.trim(),
        firstLastName: this.model.firstLastName.trim(),
        secondLastName: this.model.secondLastName?.trim() ?? '',
        email: this.model.email.trim(),
        phoneNumber: this.model.phoneNumber,
        roleId: this.model.roleId,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
