import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ScopeService, ScopeTemplateDTO } from '../../../scope/scope.service';
import { CatalogService, CatalogItemDTO } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

interface FlatCatalogItem {
  catalogItemId: number;
  catalogTypeName: string;
  description: string;
  checked: boolean;
}

@Component({
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './template-edit.html',
  styleUrl: './template-edit.css',
})
export class TemplateEdit implements OnInit {
  @Input() template!: ScopeTemplateDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  editName = '';
  items: FlatCatalogItem[] = [];
  searchTerm = '';
  selectedTypeName: string | null = null;
  loading = true;

  filteredItems: FlatCatalogItem[] = [];

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.editName = this.template.templateName;
    this.loaderService.show();
    this.catalogService.getFullTree().subscribe({
      next: (catalog) => {
        const assigned = new Set(this.template.items.map((i) => i.catalogItemId));
        this.items = catalog.map((item) => ({
          catalogItemId: item.catalogItemId,
          catalogTypeName: item.catalogTypeName,
          description: item.catalogItemDescription,
          checked: assigned.has(item.catalogItemId),
        }));
        this.recomputeFiltered();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  get typeNames(): string[] {
    return [...new Set(this.items.map((i) => i.catalogTypeName))].sort();
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  get totalCount(): number {
    return this.items.length;
  }

  selectTypeName(name: string | null): void {
    this.selectedTypeName = name;
    this.recomputeFiltered();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    let list = this.items;
    if (this.selectedTypeName) list = list.filter((i) => i.catalogTypeName === this.selectedTypeName);
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((i) => i.description.toLowerCase().includes(term));
    this.filteredItems = list;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => (i.checked = checked));
  }

  trackByItemId(_: number, item: FlatCatalogItem): number {
    return item.catalogItemId;
  }

  save(): void {
    if (!this.editName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'El nombre no puede estar vacío.' });
      return;
    }
    const checkedItems = this.items.filter((i) => i.checked);
    const items = checkedItems.map((item, idx) => ({
      catalogItemId: item.catalogItemId,
      catalogItemDescription: item.description,
      scopeTemplateItemParentId: null,
      displayOrder: idx + 1,
    }));
    this.loaderService.show();
    this.scopeService
      .updateTemplate({
        scopeTemplateId: this.template.scopeTemplateId,
        templateName: this.editName.trim(),
        items,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.saved.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Plantilla actualizada', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
