import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubStageService } from "../../../../../services/subStage.service";
import { SubStagePagedDTO } from "../../../../../models/subStagePaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { SubStageCreateDTO } from "../../../../../models/subStageCreate.model";
import { FormsModule } from "@angular/forms";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-subetapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './subetapas.html',
  styleUrl: './subetapas.css',
})
export class Subetapas implements OnInit {
  subStages!: SubStagePagedDTO;
  loadingModal = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  loadingLoadSubStages = false;

  showCreateModal = false;
  createDto: SubStageCreateDTO = {
    subStageDescription: '',
    active: true
  };

  constructor(private subStageService: SubStageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSubStages();
  }
  loadSubStages(page: number = 1) {
    this.loadingLoadSubStages = true;
    forkJoin({
      subStages: this.subStageService.getSubStagePaged(page),
    }).subscribe({
      next: ({ subStages }) => {
        this.subStages = subStages;
        this.currentPage = subStages.page;
        this.totalPages = subStages.totalPages;
        this.pageSize = subStages.pageSize;
        this.totalRecords = subStages.totalRecords;
        this.loadingLoadSubStages = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadSubStages = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  saveSubStage() {
    if (!this.createDto.subStageDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.subStageService.createSubStage(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { subStageDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadSubStages();
        Swal.fire({
          title: 'Subetapa creada exitosamente',
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
  deleteSubStage(subStageId: number, event: MouseEvent) {
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
        this.subStageService.deleteSubStage(subStageId, 1).subscribe({
          next: () => {
            this.loadSubStages();
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
      this.loadSubStages(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadSubStages(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSubStages(page);
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