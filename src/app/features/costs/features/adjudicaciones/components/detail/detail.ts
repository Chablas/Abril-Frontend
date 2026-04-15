import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { ProjectSubContractorDTO } from '../../dtos/projectSubContractorDto.model';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail {
  @Input() item!: ProjectSubContractorDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>();

  readonly steps = [
    'Enviado',
    'En revisión',
    'Aprobado',
    'Enviado al SC',
    'Llegada a Of. Central',
    'Procesos de firma',
    'Escaneado',
    'Enviado a obra',
  ];

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get currentStep(): number {
    return this.item.projectSubContractorStatusId;
  }

  get forwardLabel(): string {
    switch (this.currentStep) {
      case 1: return 'Enviar notificación';
      default: return 'Siguiente paso';
    }
  }

  canGoBack(): boolean {
    return this.currentStep > 1;
  }

  canGoForward(): boolean {
    return this.currentStep < 8;
  }

  goBack(): void {
    this.changeStatus(this.currentStep - 1);
  }

  goForward(): void {
    if (this.currentStep === 1) {
      this.sendNotification();
    } else {
      this.changeStatus(this.currentStep + 1);
    }
  }

  private sendNotification(): void {
    const graphToken = localStorage.getItem('graph_access_token') ?? '';
    this.loaderService.show();
    this.adjudicacionesService.sendNotification({
      projectSubContractorId: this.item.projectSubContractorId,
      graphAccessToken: graphToken,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Notificación enviada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private changeStatus(newStatusId: number): void {
    //this.loaderService.show();
    /*this.adjudicacionesService.updateStatus(this.item.projectSubContractorId, newStatusId).subscribe({
      next: () => {
        this.item = { ...this.item, projectSubContractorStatusId: newStatusId, projectSubContractorStatusDescription: this.steps[newStatusId - 1] };
        this.loaderService.hide();
        this.statusChanged.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });*/
  }
}
