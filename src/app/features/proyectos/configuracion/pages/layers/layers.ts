import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { LayerService } from "../../../../../services/layer.service";
import { LayerPagedDTO } from "../../../../../models/layer/layerPaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { LayerCreateDTO } from "../../../../../models/layer/layerCreate.model";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-layers',
  imports: [CommonModule, FormsModule],
  templateUrl: './layers.html',
  styleUrl: './layers.css',
})
export class Layers implements OnInit {
  layers!: LayerPagedDTO;
  loadingModal = false;
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;
  loadingLoadLayers = false;

  showCreateModal = false;
  createDto: LayerCreateDTO = {
    layerDescription: '',
    active: true
  };

  constructor(private layerService: LayerService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadLayers();
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  loadLayers(page: number = 1) {
    this.loadingLoadLayers = true;
    forkJoin({
      layers: this.layerService.getLayerPaged(page),
    }).subscribe({
      next: ({ layers }) => {
        this.layers = layers;
        this.currentPage = layers.page;
        this.totalPages = layers.totalPages;
        this.pageSize = layers.pageSize;
        this.totalRecords = layers.totalRecords;
        this.loadingLoadLayers = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadingLoadLayers = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.error,
        });
      }
    });
  }

  saveLayer() {
    if (!this.createDto.layerDescription.trim()) {
      return;
    }
    this.loadingModal = true;
    this.layerService.createLayer(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { layerDescription: '', active: true };
        this.loadingModal = false;
        this.cdr.detectChanges();
        this.loadLayers();
        Swal.fire({
          title: 'Nivel creado exitosamente',
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

  deleteLayer(layerId: number, event: MouseEvent) {
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
        this.layerService.deleteLayer(layerId, 1).subscribe({
          next: () => {
            this.loadLayers();
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
      this.loadLayers(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.loadLayers(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadLayers(page);
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