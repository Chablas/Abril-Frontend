import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PhaseService } from "../../../../../services/phase.service";
import { PhasePagedDTO } from "../../../../../models/phasePaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhaseCreateDTO } from "../../../../../models/phaseCreate.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-fases',
  imports: [CommonModule, FormsModule],
  templateUrl: './fases.html',
  styleUrl: './fases.css',
})
export class Fases implements OnInit {
  phases!: PhasePagedDTO;
  loadingModal = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  loadingLoadPhases = false;

  showCreateModal = false;
  createDto: PhaseCreateDTO = {
    phaseDescription: '',
    active: true
  };

  constructor(private phaseService: PhaseService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadPhases();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  loadPhases(page: number = 1) {
    this.loadingLoadPhases = true;
    forkJoin({
      phases: this.phaseService.getPhasePaged(page),
    }).subscribe({
      next: ({ phases }) => {
        this.phases = phases;
        this.currentPage = phases.page;
        this.totalPages = phases.totalPages;
        this.pageSize = phases.pageSize;
        this.totalRecords = phases.totalRecords;
        this.loadingLoadPhases = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadPhases = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  savePhase() {
    if (!this.createDto.phaseDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.phaseService.createPhase(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { phaseDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadPhases();
        Swal.fire({
          title: 'Fase creada exitosamente',
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

  deletePhase(phaseId: number, event: MouseEvent) {
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
        this.phaseService.deletePhase(phaseId, 1).subscribe({
          next: () => {
            this.loadPhases();
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
      this.loadPhases(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadPhases(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadPhases(page);
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