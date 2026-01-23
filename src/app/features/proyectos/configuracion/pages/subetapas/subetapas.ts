import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SubStageService } from "../../../../../services/subStage.service";
import { SubStagePagedDTO } from "../../../../../models/subStagePaged.model";
import { forkJoin } from 'rxjs';
import { CommonModule } from "@angular/common";
import { SubStageCreateDTO } from "../../../../../models/subStageCreate.model";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-subetapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './subetapas.html',
  styleUrl: './subetapas.css',
})
export class Subetapas implements OnInit {
  subStages!: SubStagePagedDTO;
  loading = false;

  showCreateModal = false;
  createDto: SubStageCreateDTO = {
    subStageDescription: '',
    active: true
  };

  constructor(private subStageService: SubStageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSubStages();
  }
  loadSubStages() {
    this.loading = true;
  
    forkJoin({
      subStages: this.subStageService.getSubStagePaged(1),
    }).subscribe({
      next: ({ subStages }) => {
        this.subStages = subStages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveSubStage() {
    if (!this.createDto.subStageDescription.trim()) {
      return;
    }

    this.subStageService.createSubStage(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { subStageDescription: '', active: true };
        this.loadSubStages();
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