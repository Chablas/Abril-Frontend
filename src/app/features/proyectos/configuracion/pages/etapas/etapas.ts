import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { StageService } from "../../../../../services/stage.service";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { forkJoin } from 'rxjs';
import { StagePagedDTO } from "../../../../../models/stagePaged.model";
import { StageCreateDTO } from "../../../../../models/stageCreate.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-etapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './etapas.html',
  styleUrl: './etapas.css',
})
export class Etapas implements OnInit {
  stages!: StagePagedDTO;
  loadingModal = false;
  loadingLoadStages = false;

  showCreateModal = false;
  createDto: StageCreateDTO = {
    stageDescription: '',
    active: true
  };

  constructor(private stageService: StageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStages();
  }

  loadStages() {
    this.loadingLoadStages = true;
    forkJoin({
      stages: this.stageService.getStagePaged(1),
    }).subscribe({
      next: ({ stages }) => {
        this.stages = stages;
        this.loadingLoadStages = false;
        this.cdr.detectChanges();
      },
      error: err => {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  saveStage() {
    if (!this.createDto.stageDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.stageService.createStage(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { stageDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadStages();
        Swal.fire({
          title: 'Etapa creada exitosamente',
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

  deleteStage(stageId: number, event: MouseEvent) {
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
        this.stageService.deleteStage(stageId, 1).subscribe({
          next: () => {
            this.loadStages();
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