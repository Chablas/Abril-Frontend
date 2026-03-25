import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../../core/services/user.service';
import { UserDTO } from '../../../../../core/dtos/user/user.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

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

  getRolesText(roles: RoleSimpleDTO[]): string {
    if (!roles) return '';
    return roles.map((r) => r.roleDescription).join(', ');
  }
}
