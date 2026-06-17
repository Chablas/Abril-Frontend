import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { DossierService } from '../../../../services/dossier.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { SharepointUploadService } from '../../../../services/sharepoint-upload.service';
import {
  DOSSIER_TIPOS,
  DossierDocumentoDto,
  DossierEstadoDocumento,
  DossierSemanaDetalleDto,
  DossierTipoDocumento,
} from '../../../../dtos/dossier.model';

@Component({
  selector: 'app-dossier-revisar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dossier-revisar-modal.html',
  styleUrl: './dossier-revisar-modal.css',
})
export class DossierRevisarModal implements OnInit {
  @Input() semanaId!: number;
  @Output() closed = new EventEmitter<boolean>();

  detalle: DossierSemanaDetalleDto | null = null;
  loading = true;
  guardando = false;
  comentario = '';
  modoObservar = false;

  readonly tipos = DOSSIER_TIPOS;

  constructor(
    private dossierService: DossierService,
    private sharepointService: SharepointUploadService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.dossierService.getSemanaDetalle(this.semanaId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  getDoc(tipo: DossierTipoDocumento): DossierDocumentoDto | undefined {
    return this.detalle?.documentos.find((d) => d.tipoDocumento === tipo);
  }

  chipDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'chip-green';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  chipSemana(estado: string): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Observado' || estado === 'Enviado') return 'chip-orange';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  verArchivo(doc: DossierDocumentoDto): void {
    if (!doc.archivoUrl) return;
    this.sharepointService.getArchivoUrl(doc.archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  aprobar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar dossier?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.guardar('Aprobado');
    });
  }

  observar(): void {
    this.modoObservar = true;
    this.cdr.detectChanges();
  }

  confirmarObservacion(): void {
    if (!this.comentario.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la observación', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    this.guardar('Observado', this.comentario.trim());
  }

  private guardar(estado: string, comentario?: string): void {
    this.guardando = true;
    this.loaderService.show();
    this.dossierService.revisarDossier(this.semanaId, { estado, comentario }).subscribe({
      next: () => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: estado === 'Aprobado' ? 'Aprobado' : 'Observación registrada', timer: 1500, showConfirmButton: false });
        this.closed.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrar(): void {
    this.closed.emit(false);
  }
}
