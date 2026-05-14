import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { PsssTemplateService } from '../../services/psss-template.service';
import { PsssTemplateDTO, PsssAllFlatDTO } from '../../dtos/psss-template.model';
import Swal from 'sweetalert2';

interface PsssItem extends PsssAllFlatDTO {
  checked: boolean;
}

interface PhaseOption {
  phaseId: number;
  phaseDescription: string;
}

@Component({
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './template-edit.html',
  styleUrl: './template-edit.css',
})
export class TemplateEdit implements OnInit {
  @Input() template!: PsssTemplateDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() templateUpdated = new EventEmitter<void>();

  items: PsssItem[] = [];
  phases: PhaseOption[] = [];
  searchTerm = '';
  selectedPhaseId: number | null = null;
  loading = true;

  constructor(
    private templateService: PsssTemplateService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    forkJoin({
      all: this.templateService.getAllPsssFlat(),
      assigned: this.templateService.getTemplatePsssIds(this.template.psssTemplateId),
    }).subscribe({
      next: ({ all, assigned }) => {
        const assignedSet = new Set(assigned);
        this.items = all.map((p) => ({ ...p, checked: assignedSet.has(p.psssId) }));
        this.phases = this.buildPhases();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private buildPhases(): PhaseOption[] {
    const seen = new Set<number>();
    const result: PhaseOption[] = [];
    for (const item of this.items) {
      if (!seen.has(item.phaseId)) {
        seen.add(item.phaseId);
        result.push({ phaseId: item.phaseId, phaseDescription: item.phaseDescription });
      }
    }
    return result;
  }

  get filteredItems(): PsssItem[] {
    let list = this.items;
    if (this.selectedPhaseId !== null) {
      list = list.filter((i) => i.phaseId === this.selectedPhaseId);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((i) => i.label.toLowerCase().includes(term));
    }
    return list;
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  trackByPhaseId(_: number, p: PhaseOption): number {
    return p.phaseId;
  }

  trackByPsssId(_: number, i: PsssItem): number {
    return i.psssId;
  }

  toggleAll(checked: boolean) {
    this.filteredItems.forEach((i) => (i.checked = checked));
  }

  save() {
    const psssIds = this.items.filter((i) => i.checked).map((i) => i.psssId);
    this.loaderService.show();
    this.templateService
      .updateTemplatePsss(this.template.psssTemplateId, { psssIds })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.templateUpdated.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Plantilla actualizada', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
  }
}
