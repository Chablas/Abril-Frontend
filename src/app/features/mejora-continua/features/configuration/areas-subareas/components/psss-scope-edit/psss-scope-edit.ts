import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { PsssTemplateService } from '../../../templates/services/psss-template.service';
import { PsssScopeService } from '../../services/psss-scope.service';
import { PsssAllFlatDTO, PsssTemplateSimpleDTO } from '../../../templates/dtos/psss-template.model';
import Swal from 'sweetalert2';

interface PsssItem extends PsssAllFlatDTO {
  checked: boolean;
}

@Component({
  selector: 'app-psss-scope-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './psss-scope-edit.html',
  styleUrl: './psss-scope-edit.css',
})
export class PsssScopeEdit implements OnInit {
  /** Pass areaId OR subAreaId (not both) */
  @Input() areaId?: number;
  @Input() subAreaId?: number;
  @Input() entityName = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  items: PsssItem[] = [];
  templates: PsssTemplateSimpleDTO[] = [];
  searchTerm = '';
  selectedTemplateId: number | null = null;
  loading = true;

  constructor(
    private templateService: PsssTemplateService,
    private scopeService: PsssScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();

    const assignedObs = this.areaId
      ? this.scopeService.getScopeByArea(this.areaId)
      : this.scopeService.getScopeBySubArea(this.subAreaId!);

    forkJoin({
      allPsss: this.templateService.getAllPsssFlat(),
      templates: this.templateService.getAllTemplates(),
      assigned: assignedObs,
    }).subscribe({
      next: ({ allPsss, templates, assigned }) => {
        const assignedSet = new Set(assigned);
        this.items = allPsss.map((p) => ({ ...p, checked: assignedSet.has(p.psssId) }));
        this.templates = templates;
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  get filteredItems(): PsssItem[] {
    let list = this.items;
    if (this.selectedTemplateId !== null) {
      list = list.filter((i) => i.templateId === this.selectedTemplateId);
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

  trackByTemplateId(_: number, t: PsssTemplateSimpleDTO): number {
    return t.psssTemplateId;
  }

  trackByPsssId(_: number, i: PsssItem): number {
    return i.psssId;
  }

  toggleAll(checked: boolean) {
    this.filteredItems.forEach((i) => (i.checked = checked));
  }

  save() {
    const psssIds = this.items.filter((i) => i.checked).map((i) => i.psssId);
    const saveObs = this.areaId
      ? this.scopeService.updateScopeByArea(this.areaId, { psssIds })
      : this.scopeService.updateScopeBySubArea(this.subAreaId!, { psssIds });

    this.loaderService.show();
    saveObs.subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Relaciones actualizadas', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
