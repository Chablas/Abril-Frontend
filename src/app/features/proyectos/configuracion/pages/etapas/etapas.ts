import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { StageService } from "../../../../../services/stage.service";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { forkJoin } from 'rxjs';
import { StagePagedDTO } from "../../../../../models/stagePaged.model";
import { StageCreateDTO } from "../../../../../models/stageCreate.model";

@Component({
  selector: 'app-etapas',
  imports: [CommonModule, FormsModule],
  templateUrl: './etapas.html',
  styleUrl: './etapas.css',
})
export class Etapas implements OnInit {
  stages!: StagePagedDTO;
  loading = false;

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
    this.loading = true;
  
    forkJoin({
      stages: this.stageService.getStagePaged(1),
    }).subscribe({
      next: ({ stages }) => {
        this.stages = stages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading data', err);
        this.loading = false;
      }
    });
  }

  saveStage() {
    if (!this.createDto.stageDescription.trim()) {
      return;
    }

    this.stageService.createStage(this.createDto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.createDto = { stageDescription: '', active: true };
        this.loadStages();
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