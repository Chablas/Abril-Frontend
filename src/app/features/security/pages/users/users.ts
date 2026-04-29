import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserList } from './list/list';
import { UserCreate } from './create/create';
import { UserEditForm } from './components/user-edit-form/user-edit-form';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { UserDTO } from '../../../../core/dtos/user/user.model';

@Component({
  selector: 'app-users',
  imports: [CommonModule, UserList, UserCreate, UserEditForm, Paginator],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  showCreateModal = false;
  formOpen = false;
  formUser: UserDTO | null = null;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  @ViewChild(UserList) userList!: UserList;

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditForm(user: UserDTO) {
    this.formUser = user;
    this.formOpen = true;
  }

  onEditSaved() {
    this.formOpen = false;
    this.reloadUsers();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.userList.loadUsers(page);
  }

  updatePagination(data: PagedResponseDTO<UserDTO>) {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }

  reloadUsers() {
    this.userList.loadUsers(this.currentPage);
  }
}
