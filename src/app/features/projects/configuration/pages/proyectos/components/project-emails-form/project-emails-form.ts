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
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../../core/services/project.service';
import { ProjectEmailsDTO } from '../../../../../../../core/dtos/project/projectEmails.model';

@Component({
  selector: 'app-project-emails-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './project-emails-form.html',
  styleUrl: './project-emails-form.css',
})
export class ProjectEmailsForm implements OnChanges {
  @Input() open = false;
  @Input() projectId = 0;
  @Input() projectDescription = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: ProjectEmailsDTO = this.empty();
  loadingInitial = false;
  saving = false;

  constructor(
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.projectId) {
      this.model = this.empty();
      this.loadCurrent();
    }
  }

  private empty(): ProjectEmailsDTO {
    return {
      emailResidente: '',
      emailResponsable: '',
      emailRrhh: '',
      emailCoordSsoma: '',
      emailCoordAdmin: '',
    };
  }

  private loadCurrent(): void {
    this.loadingInitial = true;
    this.projectService.getProjectEmails(this.projectId).subscribe({
      next: (res) => {
        this.model = {
          emailResidente: res?.emailResidente ?? '',
          emailResponsable: res?.emailResponsable ?? '',
          emailRrhh: res?.emailRrhh ?? '',
          emailCoordSsoma: res?.emailCoordSsoma ?? '',
          emailCoordAdmin: res?.emailCoordAdmin ?? '',
        };
        this.loadingInitial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingInitial = false;
        this.cdr.detectChanges();
      },
    });
  }

  submit(): void {
    if (this.saving) return;
    const payload: ProjectEmailsDTO = {
      emailResidente: this.normalize(this.model.emailResidente),
      emailResponsable: this.normalize(this.model.emailResponsable),
      emailRrhh: this.normalize(this.model.emailRrhh),
      emailCoordSsoma: this.normalize(this.model.emailCoordSsoma),
      emailCoordAdmin: this.normalize(this.model.emailCoordAdmin),
    };

    this.saving = true;
    this.loaderService.show();
    this.projectService.patchProjectEmails(this.projectId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: res?.message ?? 'Emails actualizados',
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
