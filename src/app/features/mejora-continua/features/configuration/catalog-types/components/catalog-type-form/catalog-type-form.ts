import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { CatalogService, CatalogTypeDTO } from '../../../scope/catalog.service';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-catalog-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './catalog-type-form.html',
  styleUrl: './catalog-type-form.css',
})
export class CatalogTypeForm implements OnInit {
  /** null → modo crear | valor → modo editar */
  @Input() editingType: CatalogTypeDTO | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  name = '';
  code = '';
  active = true;

  get isEdit(): boolean {
    return this.editingType !== null;
  }

  get title(): string {
    return this.isEdit ? 'EDITAR TIPO DE CATÁLOGO' : 'NUEVO TIPO DE CATÁLOGO';
  }

  constructor(
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.editingType) {
      this.name = this.editingType.catalogTypeName;
      this.code = this.editingType.catalogTypeCode;
      this.active = this.editingType.active;
    }
  }

  save(): void {
    if (!this.name.trim() || !this.code.trim()) {
      Swal.fire({ icon: 'error', title: 'Campos requeridos', text: 'Nombre y código son obligatorios.' });
      return;
    }

    this.loaderService.show();

    const obs$ = this.isEdit
      ? this.catalogService.updateType({
          catalogTypeId: this.editingType!.catalogTypeId,
          catalogTypeName: this.name.trim(),
          catalogTypeCode: this.code.trim(),
          active: this.active,
        })
      : this.catalogService.createType({
          catalogTypeName: this.name.trim(),
          catalogTypeCode: this.code.trim(),
          active: true,
        });

    obs$.subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        Swal.fire({
          title: this.isEdit ? 'Tipo actualizado' : 'Tipo creado',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
