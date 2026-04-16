import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
export class Detail implements OnInit {
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

  /** Paso que se está mostrando en pantalla (navegable). */
  viewStep = 1;

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.viewStep = this.item.projectSubContractorStatusId;
  }

  /** Estado real del item en el backend. */
  get actualStatus(): number {
    return this.item.projectSubContractorStatusId;
  }

  get forwardLabel(): string {
    // Solo muestra "Enviar correos" cuando el estado real es 1,
    // sin importar qué paso se esté visualizando.
    return this.actualStatus === 1 ? 'Enviar correos' : 'Siguiente paso';
  }

  canGoBack(): boolean {
    return this.viewStep > 1;
  }

  canGoForward(): boolean {
    // Si el estado real es 1: el botón siempre está habilitado (acción de enviar correos).
    // Si el estado real es > 1: solo se puede avanzar hasta el paso actual real.
    if (this.actualStatus === 1) return true;
    return this.viewStep < this.actualStatus;
  }

  goBack(): void {
    if (this.viewStep > 1) this.viewStep--;
  }

  goForward(): void {
    if (this.actualStatus === 1) {
      // Solo aquí se envían correos: cuando el estado REAL es 1.
      this.sendNotification();
    } else {
      // Navegación de revisión: avanza el paso visualizado hasta el estado real.
      if (this.viewStep < this.actualStatus) this.viewStep++;
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
}
