import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../../core/services/user.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { UserDTO } from '../../../../../core/dtos/user/user.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class UserList implements OnInit {
  tableData: PagedResponseDTO<UserDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  searchTerm = '';

  @Output() pagedData = new EventEmitter<PagedResponseDTO<UserDTO>>();
  @Output() editUser = new EventEmitter<UserDTO>();
  @Output() userToggled = new EventEmitter<void>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.loadUsers());
  }

  get filteredData(): UserDTO[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.tableData.data;
    return this.tableData.data.filter((u) =>
      u.person.fullName.toLowerCase().includes(term)
    );
  }

  loadUsers(page: number = 1) {
    this.loaderService.show();
    this.userService.getUserPaged(page).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  resendEmail(user: UserDTO, event: MouseEvent) {
    event.stopPropagation();
    this.loaderService.show();
    this.authService.forgotPassword(user.userId).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: 'Correo reenviado',
          text: `Se reenvió el correo a ${user.person.email}`,
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(user: UserDTO, event: MouseEvent) {
    event.stopPropagation();
    this.editUser.emit(user);
  }

  toggleUser(user: UserDTO, event: MouseEvent) {
    event.stopPropagation();
    const accion = user.active ? 'desactivar' : 'activar';
    Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      text: `${user.person.fullName} será ${user.active ? 'desactivado' : 'activado'}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.userService.toggleUser(user.userId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.userToggled.emit();
          Swal.fire({ title: 'Estado actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  getRolesText(roles: RoleSimpleDTO[]): string {
    if (!roles) return '';
    return roles.map((r) => r.roleDescription).join(', ');
  }
}
