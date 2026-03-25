import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../../../core/services/user.service';
import { PersonService } from '../../../../../core/services/person.service';
import { RoleService } from '../../../../../core/services/role.service';
import { UserCreateDTO } from '../../../../../core/dtos/user/userCreate.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-create',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class UserCreate implements OnInit {
  roles: RoleSimpleDTO[] = [];

  createDto: UserCreateDTO = {
    documentIdentityCode: '',
    firstNames: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    phoneNumber: 0,
    createdUserId: 1,
    active: true,
    roleId: 0,
  };

  @Output() closeModal = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<void>();

  constructor(
    private userService: UserService,
    private personService: PersonService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    this.loaderService.show();
    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res,
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  getPersonRENIEC() {
    const dni = this.createDto.documentIdentityCode?.trim();
    if (!dni || dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }
    this.loaderService.show();
    this.personService.getPersonRENIEC(dni).subscribe({
      next: (res) => {
        this.createDto.firstNames = res.first_name;
        this.createDto.firstLastName = res.first_last_name;
        this.createDto.secondLastName = res.second_last_name;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  saveUser() {
    this.loaderService.show();
    this.userService.createUser(this.createDto).subscribe({
      next: () => {
        this.loaderService.hide();
        this.userCreated.emit();
        this.closeModal.emit();
        Swal.fire({
          title: 'Usuario creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
