import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from "../../../../services/user.service";
import { PersonService } from "../../../../services/person.service";
import { PagedResponseDTO } from "../../../../models/pagedResponse.model";
import { UserDTO } from "../../../../models/user.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserCreateDTO } from "../../../../models/userCreate.model";

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  users!: PagedResponseDTO<UserDTO>;
  loading = false;

  showCreateModal = false;
  createDto: UserCreateDTO = {
    dni: '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    active: true
  };

  constructor(private userService: UserService, private personService: PersonService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  getPersonRENIEC() {
    const dni = this.createDto.dni?.trim();
  
    if (!dni || dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos');
      return;
    }
  
    this.loading = true;
  
    this.personService.getPersonRENIEC(dni).subscribe({
      next: res => {
        this.createDto.firstName = res.first_name;
        this.createDto.secondName = '';
        this.createDto.firstLastName = res.first_last_name;
        this.createDto.secondLastName = res.second_last_name;
  
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error RENIEC', err);
        alert('No se encontró el DNI');
        this.loading = false;
      }
    });
  }

  loadUsers() {
    this.loading = true;
  
    forkJoin({
      users: this.userService.getUserPaged(1),
    }).subscribe({
      next: ({ users }) => {
        this.users = users;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveUser() {

    this.userService.createUser(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        //this.createDto = { userDescription: '', active: true };
        this.loadUsers();
      },
      error: err => {
        console.error('Error creating user', err);
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }
}