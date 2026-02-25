import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../../core/services/user.service';
import { PersonService } from '../../../../core/services/person.service';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { UserDTO } from '../../../../core/dtos/user/user.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCreateDTO } from '../../../../core/dtos/user/userCreate.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  users: PagedResponseDTO<UserDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: UserCreateDTO = {
    documentIdentityCode: '',
    firstNames: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    phoneNumber: 0,
    createdUserId: 1,
    active: true,
  };

  loader = false;

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  showCreateModal = false;

  constructor(
    private userService: UserService,
    private personService: PersonService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
    }
  }

  getPersonRENIEC() {
    const dni = this.createDto.documentIdentityCode?.trim();

    if (!dni || dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }

    this.loader = true;
    this.cdr.detectChanges();
    this.personService.getPersonRENIEC(dni).subscribe({
      next: (res) => {
        this.createDto.firstNames = res.first_name;
        this.createDto.firstLastName = res.first_last_name;
        this.createDto.secondLastName = res.second_last_name;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error(err);
      },
    });
  }

  loadUsers(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();
    forkJoin({
      users: this.userService.getUserPaged(page),
    }).subscribe({
      next: ({ users }) => {
        this.users = users;
        this.currentPage = users.page;
        this.totalPages = users.totalPages;
        this.pageSize = users.pageSize;
        this.totalRecords = users.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error(err);
      },
    });
  }

  saveUser() {
    this.loader = true;
    this.cdr.detectChanges();
    this.userService.createUser(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loader = false;
        this.cdr.detectChanges();
        this.loadUsers();
        Swal.fire({
          title: 'Usuario creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err) => {
        this.error(err);
      },
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadUsers(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadUsers(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadUsers(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
