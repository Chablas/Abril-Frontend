import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubSpecialtyService } from "../../../../../services/subspecialty.service";
import { SubSpecialtyPagedDTO } from "../../../../../models/subSpecialtyPaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { SubSpecialtyCreateDTO } from "../../../../../models/subSpecialtyCreate.model";
import { FormsModule } from "@angular/forms";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-subespecialidades',
  imports: [CommonModule, FormsModule],
  templateUrl: './subespecialidades.html',
  styleUrl: './subespecialidades.css',
})
export class Subespecialidades implements OnInit {
  subspecialties!: SubSpecialtyPagedDTO;
  loadingModal = false;
  loadingLoadSubSpecialties = false;

  showCreateModal = false;
  createDto: SubSpecialtyCreateDTO = {
    subSpecialtyDescription: '',
    active: true
  };

  constructor(private subSpecialtyService: SubSpecialtyService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSubSpecialties();
  }
  loadSubSpecialties(){
    this.loadingLoadSubSpecialties = true;
    forkJoin({
      subspecialties: this.subSpecialtyService.getSubSpecialtyPaged(1),
    }).subscribe({
      next: ({ subspecialties }) => {
        this.subspecialties = subspecialties;
        this.loadingLoadSubSpecialties = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadSubSpecialties = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  saveSubSpecialty() {
    if (!this.createDto.subSpecialtyDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.subSpecialtyService.createSubSpecialty(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { subSpecialtyDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadSubSpecialties();
        Swal.fire({
          title: 'Subespecialidad creada exitosamente',
          icon: 'success',
          draggable: true
        });
      },
      error: err => {
        this.loadingModal = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }

  deleteSubSpecialty(subSpecialtyId: number, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!'
    }).then(result => {
      if (result.isConfirmed) {
        this.loadingModal = true;
        this.subSpecialtyService.deleteSubSpecialty(subSpecialtyId, 1).subscribe({
          next: () => {
            this.loadSubSpecialties();
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success'
            });
          },
          error: (error) => {
            this.loadingModal = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: 'Error',
              text: error.error,
              icon: 'error'
            });
          },
        });
      }
    });
  }


  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }
}