import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from "@angular/common/http";
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { RoleFeatureService } from '../../services/role.service';
import { RoleDto } from '../../dtos/role.model';
import { FeatureDto } from '../../dtos/feature.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

interface FeatureItem extends FeatureDto {
  checked: boolean;
}

interface ModuleOption {
  moduleId: number;
  moduleName: string;
}

@Component({
  selector: 'app-role-edit',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './role-edit.html',
  styleUrl: './role-edit.css',
})
export class RoleEdit implements OnInit {
  @Input() role!: RoleDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() roleUpdated = new EventEmitter<void>();

  features: FeatureItem[] = [];
  modules: ModuleOption[] = [];
  searchTerm = '';
  selectedModuleId: number | null = null;
  loading = true;

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    forkJoin({
      all: this.roleService.getAllFeatures(),
      assigned: this.roleService.getRoleFeatureIds(this.role.roleId),
    }).subscribe({
      next: ({ all, assigned }) => {
        const assignedSet = new Set(assigned);
        this.features = all.map((f) => ({ ...f, checked: assignedSet.has(f.featureId) }));
        this.modules = this.buildModules();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private buildModules(): ModuleOption[] {
    const seen = new Set<number>();
    const result: ModuleOption[] = [];
    for (const f of this.features) {
      if (f.moduleId != null && !seen.has(f.moduleId)) {
        seen.add(f.moduleId);
        result.push({ moduleId: f.moduleId, moduleName: f.moduleName ?? '' });
      }
    }
    return result;
  }

  get filteredFeatures(): FeatureItem[] {
    let list = this.features;
    if (this.selectedModuleId !== null) {
      list = list.filter((f) => f.moduleId === this.selectedModuleId);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((f) => f.featureKey.toLowerCase().includes(term));
    }
    return list;
  }

  get checkedCount(): number {
    return this.features.filter((f) => f.checked).length;
  }

  trackByModuleId(_: number, m: ModuleOption): number {
    return m.moduleId;
  }

  trackByFeatureId(_: number, f: FeatureItem): number {
    return f.featureId;
  }

  toggleAll(checked: boolean) {
    this.filteredFeatures.forEach((f) => (f.checked = checked));
  }

  save() {
    const featureIds = this.features.filter((f) => f.checked).map((f) => f.featureId);
    this.loaderService.show();
    this.roleService.updateRoleFeatures(this.role.roleId, featureIds).subscribe({
      next: () => {
        this.loaderService.hide();
        this.roleUpdated.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Funcionalidades actualizadas', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
