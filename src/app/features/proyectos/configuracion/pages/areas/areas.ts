import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AreaService } from "../../../../../services/area.service";
import { AreaPagedDTO } from "../../../../../models/areaPaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AreaCreateDTO } from "../../../../../models/areaCreate.model";

@Component({
  selector: 'app-areas',
  imports: [CommonModule, FormsModule],
  templateUrl: './areas.html',
  styleUrl: './areas.css',
})
export class Areas implements OnInit {
  areas!: AreaPagedDTO;
  loading = false;

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
    this.loading = true;
  
    forkJoin({
      areas: this.areaService.getAreaPaged(1),
    }).subscribe({
      next: ({ areas }) => {
        this.areas = areas;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveArea() {
    if (!this.createDto.areaDescription.trim()) {
      return;
    }

    this.areaService.createArea(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { areaDescription: '', active: true };
        this.loadAreas();
      },
      error: err => {
        console.error('Error creating area', err);
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }
}