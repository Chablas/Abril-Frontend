import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { swalUdpSuccess } from '../../../../../shared/utils/sweetalert-udp';
import { ContratosService } from '../../services/contratos.service';
import { ProjectContractFolderDTO } from '../../dtos/contrato.dtos';

/**
 * Configuración de la carpeta de SharePoint donde se guardan los contratos generados de un
 * proyecto (paso 3). Sin carpeta el contrato igual se genera y se descarga, solo no queda
 * guardado en SharePoint.
 */
@Component({
  selector: 'app-contrato-carpeta',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './contrato-carpeta.html',
  styleUrls: ['../../shared/contratos-ui.css', './contrato-carpeta.css'],
})
export class ContratoCarpeta implements OnInit {
  @Input({ required: true }) projectId!: number;
  @Input() projectName = '';
  @Input() puedeEditar = false;
  @Output() closeModal = new EventEmitter<void>();

  carpeta: ProjectContractFolderDTO | null = null;
  linkUrl = '';
  loading = true;
  saving = false;
  submitted = false;

  constructor(
    private service: ContratosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getCarpeta(this.projectId).subscribe({
      next: (carpeta) => {
        this.setCarpeta(carpeta);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  get linkInvalido(): boolean {
    const url = this.linkUrl.trim();
    return !url || !/^https:\/\/\S+$/i.test(url);
  }

  get sinCambios(): boolean {
    return !!this.carpeta && this.linkUrl.trim() === this.carpeta.linkUrl;
  }

  guardar(): void {
    this.submitted = true;
    if (this.linkInvalido || this.saving || !this.puedeEditar) return;

    this.saving = true;
    this.loaderService.show();
    this.service.guardarCarpeta(this.projectId, { linkUrl: this.linkUrl.trim() }).subscribe({
      next: (carpeta) => {
        this.setCarpeta(carpeta);
        this.saving = false;
        this.submitted = false;
        this.loaderService.hide();
        swalUdpSuccess('Carpeta guardada', 'Los contratos generados de este proyecto se guardarán ahí.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  private setCarpeta(carpeta: ProjectContractFolderDTO | null): void {
    this.carpeta = carpeta;
    this.linkUrl = carpeta?.linkUrl ?? '';
  }
}
