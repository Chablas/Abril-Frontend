import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { ProjectEditDTO } from '../../../../../../core/dtos/project/projectEdit.model';
import { EmpresaSimpleDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';

@Component({
  selector: 'app-project-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './project-edit-form.html',
  styleUrl: './project-edit-form.css',
})
export class ProjectEditForm implements OnChanges {
  @Input() open = false;
  @Input() project: ProjectGetDTO | null = null;
  @Input() empresas: EmpresaSimpleDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  estadoOptions = [
    { id: 'ACTIVO', nombre: 'ACTIVO' },
    { id: 'FINALIZADO', nombre: 'FINALIZADO' },
    { id: 'INACTIVO', nombre: 'INACTIVO' },
  ];

  model: ProjectEditDTO = this.empty();
  saving = false;

  constructor(
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): ProjectEditDTO {
    return {
      projectId: 0,
      projectDescription: '',
      projectCode: '',
      companyId: null,
      estado: 'ACTIVO',
      responsable: '',
      emailResidente: '',
      emailResponsable: '',
      emailRrhh: '',
      emailCoordSsoma: '',
      emailCoordAdmin: '',
      fechaInicio: '',
      fechaFin: '',
      areaM2: null,
      active: true,
    };
  }

  private reset(): void {
    if (!this.project) {
      this.model = this.empty();
      return;
    }
    this.model = {
      projectId: this.project.projectId,
      projectDescription: this.project.projectDescription ?? '',
      projectCode: this.project.projectCode ?? '',
      companyId: this.project.companyId ?? null,
      estado: this.project.estado ?? 'ACTIVO',
      responsable: this.project.responsable ?? '',
      emailResidente: this.project.emailResidente ?? '',
      emailResponsable: this.project.emailResponsable ?? '',
      emailRrhh: this.project.emailRrhh ?? '',
      emailCoordSsoma: this.project.emailCoordSsoma ?? '',
      emailCoordAdmin: this.project.emailCoordAdmin ?? '',
      fechaInicio: this.toIsoDate(this.project.fechaInicio),
      fechaFin: this.toIsoDate(this.project.fechaFin),
      areaM2: this.project.areaM2 ?? null,
      active: this.project.active ?? true,
    };
  }

  private toIsoDate(value?: string | null): string {
    if (!value) return '';
    return value.length >= 10 ? value.substring(0, 10) : value;
  }

  get canSubmit(): boolean {
    return !!this.model.projectDescription?.trim() && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({ icon: 'warning', title: 'Falta el nombre del proyecto' });
      return;
    }

    const payload: ProjectEditDTO = {
      projectId: this.model.projectId,
      projectDescription: this.model.projectDescription.trim(),
      projectCode: this.normalize(this.model.projectCode),
      companyId: this.model.companyId || null,
      estado: this.model.estado || null,
      responsable: this.normalize(this.model.responsable),
      emailResidente: this.normalize(this.model.emailResidente),
      emailResponsable: this.normalize(this.model.emailResponsable),
      emailRrhh: this.normalize(this.model.emailRrhh),
      emailCoordSsoma: this.normalize(this.model.emailCoordSsoma),
      emailCoordAdmin: this.normalize(this.model.emailCoordAdmin),
      fechaInicio: this.normalize(this.model.fechaInicio),
      fechaFin: this.normalize(this.model.fechaFin),
      areaM2: this.model.areaM2 != null && this.model.areaM2 !== ('' as unknown as number)
        ? Number(this.model.areaM2)
        : null,
      active: this.model.active ?? true,
    };

    this.saving = true;
    this.loaderService.show();
    this.projectService.editProject(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: res?.message ?? 'Proyecto actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private normalize(value: string | null | undefined): string | null {
    const v = (value ?? '').toString().trim();
    return v.length ? v : null;
  }

  close(): void {
    this.closed.emit();
  }
}
