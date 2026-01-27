import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AreaService } from "../../../../../services/area.service";
import { AreaPagedDTO } from "../../../../../models/areaPaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AreaCreateDTO } from "../../../../../models/areaCreate.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-areas',
  imports: [CommonModule, FormsModule],
  templateUrl: './areas.html',
  styleUrl: './areas.css'
})
export class Areas implements OnInit {
  areas!: AreaPagedDTO;
  loadingModal = false;
  loadingLoadAreas = false;

  showCreateModal = false;
  createDto: AreaCreateDTO = {
    areaDescription: '',
    active: true
  };

  constructor(private areaService: AreaService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAreas();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  loadAreas() {

    this.loadingLoadAreas = true;
    forkJoin({
      areas: this.areaService.getAreaPaged(1)
    }).subscribe({
      next: ({ areas }) => {
        this.areas = areas;
        this.loadingLoadAreas = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadAreas = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  saveArea() {
    if (!this.createDto.areaDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.areaService.createArea(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { areaDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadAreas();
        Swal.fire({
          title: 'Area creada exitosamente',
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

  deleteArea(areaId: number, event: MouseEvent) {
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
        this.areaService.deleteArea(areaId, 1).subscribe({
          next: () => {
            this.loadAreas();
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

  closeModal() {
    this.showCreateModal = false;
  }
}