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
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
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
  loadSubSpecialties(page: number = 1){
    this.loadingLoadSubSpecialties = true;
    forkJoin({
      subspecialties: this.subSpecialtyService.getSubSpecialtyPaged(page),
    }).subscribe({
      next: ({ subspecialties }) => {
        this.subspecialties = subspecialties;
        this.currentPage = subspecialties.page;
        this.totalPages = subspecialties.totalPages;
        this.pageSize = subspecialties.pageSize;
        this.totalRecords = subspecialties.totalRecords;
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
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadSubSpecialties(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadSubSpecialties(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSubSpecialties(page);
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

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }
}