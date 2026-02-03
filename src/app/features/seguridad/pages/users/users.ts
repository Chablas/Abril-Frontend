import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../../services/user.service';
import { PersonService } from '../../../../services/person.service';
import { PagedResponseDTO } from '../../../../models/pagedResponse.model';
import { UserDTO } from '../../../../models/user.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCreateDTO } from '../../../../models/userCreate.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  users!: PagedResponseDTO<UserDTO>;
  loadingModal = false;
  loadingLoad = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  showCreateModal = false;
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

  constructor(
    private userService: UserService,
    private personService: PersonService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  getPersonRENIEC() {
    const dni = this.createDto.documentIdentityCode?.trim();

    if (!dni || dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }

    this.personService.getPersonRENIEC(dni).subscribe({
      next: (res) => {
        this.createDto.firstNames = res.first_name;
        this.createDto.firstLastName = res.first_last_name;
        this.createDto.secondLastName = res.second_last_name;

        this.cdr.detectChanges();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'No se encontró el DNI',
          text: err.error,
        });
      },
    });
  }

  loadUsers(page: number = 1) {
    this.loadingLoad = true;
    forkJoin({
      users: this.userService.getUserPaged(page),
    }).subscribe({
      next: ({ users }) => {
        this.users = users;
        this.currentPage = users.page;
        this.totalPages = users.totalPages;
        this.pageSize = users.pageSize;
        this.totalRecords = users.totalRecords;
        this.loadingLoad = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingLoad = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: err.error,
        });
      },
    });
  }

  saveUser() {
    this.loadingModal = true;
    this.userService.createUser(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadUsers();
        Swal.fire({
          title: 'Usuario creado exitosamente',
          icon: 'success',
          draggable: true,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingModal = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: err.error,
        });
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

  closeModal() {
    this.showCreateModal = false;
  }
}
