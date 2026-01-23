import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubSpecialtyService } from "../../../../../services/subspecialty.service";
import { SubSpecialtyPagedDTO } from "../../../../../models/subSpecialtyPaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { SubSpecialtyCreateDTO } from "../../../../../models/subSpecialtyCreate.model";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-subespecialidades',
  imports: [CommonModule, FormsModule],
  templateUrl: './subespecialidades.html',
  styleUrl: './subespecialidades.css',
})
export class Subespecialidades implements OnInit {
  subspecialties!: SubSpecialtyPagedDTO;
  loading = false;

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
    this.loading = true;
  
    forkJoin({
      subspecialties: this.subSpecialtyService.getSubSpecialtyPaged(1),
    }).subscribe({
      next: ({ subspecialties }) => {
        this.subspecialties = subspecialties;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveSubSpecialty() {
    if (!this.createDto.subSpecialtyDescription.trim()) {
      return;
    }

    this.subSpecialtyService.createSubSpecialty(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { subSpecialtyDescription: '', active: true };
        this.loadSubSpecialties();
      },
      error: err => {
        console.error('Error creating phase', err);
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }

  createModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }
}