import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
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

  @Output() pagedData = new EventEmitter<PagedResponseDTO<UserDTO>>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.loadUsers());
  }

  loadUsers(page: number = 1) {
    this.loaderService.show();
    this.userService.getUserPaged(page).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
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

  getRolesText(roles: RoleSimpleDTO[]): string {
    if (!roles) return '';
    return roles.map((r) => r.roleDescription).join(', ');
  }
}
