import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PhaseService } from "../../../../../services/phase.service";
import { PhasePagedDTO } from "../../../../../models/phasePaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhaseCreateDTO } from "../../../../../models/phaseCreate.model";

@Component({
  selector: 'app-fases',
  imports: [CommonModule, FormsModule],
  templateUrl: './fases.html',
  styleUrl: './fases.css',
})
export class Fases implements OnInit {
  phases!: PhasePagedDTO;
  loading = false;

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

  loadPhases() {
    this.loading = true;
  
    forkJoin({
      phases: this.phaseService.getPhasePaged(1),
    }).subscribe({
      next: ({ phases }) => {
        this.phases = phases;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  savePhase() {
    if (!this.createDto.phaseDescription.trim()) {
      return;
    }

    this.phaseService.createPhase(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { phaseDescription: '', active: true };
        this.loadPhases();
      },
      error: err => {
        console.error('Error creating phase', err);
      }
    });
  }

  closeModal() {
    this.showCreateModal = false;
  }
}