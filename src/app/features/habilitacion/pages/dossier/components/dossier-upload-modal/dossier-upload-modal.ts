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
import {
  DOSSIER_TIPOS,
  DossierDocumentoDto,
  DossierEstadoDocumento,
  DossierSemanaDetalleDto,
  DossierTipoDocumento,
} from '../../../../dtos/dossier.model';

@Component({
  selector: 'app-dossier-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dossier-upload-modal.html',
  styleUrl: './dossier-upload-modal.css',
})
export class DossierUploadModal implements OnInit {
  @Input() semanaId!: number;
  @Output() closed = new EventEmitter<boolean>();

  detalle: DossierSemanaDetalleDto | null = null;
  loading = true;
  enviando = false;

  readonly tipos = DOSSIER_TIPOS;

  justificacionesNa: Record<string, string> = {};
  mostrarJustificacion: Record<string, boolean> = {};
  subiendoPor: Record<string, boolean> = {};

  constructor(
    private dossierService: DossierService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
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

  chipSemana(estado: string): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Observado') return 'chip-orange';
    if (estado === 'Enviado') return 'chip-orange';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  chipDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'chip-green';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  labelDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'Subido';
    if (estado === 'NoAplica') return 'N/A';
    return 'Pendiente';
  }

  triggerUpload(tipo: DossierTipoDocumento): void {
    const input = document.getElementById(`file-${tipo}`) as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event, tipo: DossierTipoDocumento): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.subiendoPor[tipo] = true;
    this.cdr.detectChanges();
    this.dossierService.subirDocumento(this.semanaId, tipo, file).subscribe({
      next: () => {
        this.subiendoPor[tipo] = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoPor[tipo] = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  toggleNa(tipo: DossierTipoDocumento): void {
    this.mostrarJustificacion[tipo] = !this.mostrarJustificacion[tipo];
    this.cdr.detectChanges();
  }

  confirmarNa(tipo: DossierTipoDocumento): void {
    const doc = this.getDoc(tipo);
    if (!doc) return;
    this.dossierService.marcarDocumentoNa(doc.id, this.justificacionesNa[tipo] || undefined).subscribe({
      next: () => {
        this.mostrarJustificacion[tipo] = false;
        this.justificacionesNa[tipo] = '';
        this.load();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  get todoResuelto(): boolean {
    if (!this.detalle) return false;
    return this.tipos.every((t) => {
      const doc = this.getDoc(t);
      return doc?.estado === 'Subido' || doc?.estado === 'NoAplica';
    });
  }

  get puedeEnviar(): boolean {
    return (
      this.todoResuelto &&
      !!this.detalle &&
      this.detalle.estado !== 'Enviado' &&
      this.detalle.estado !== 'Aprobado'
    );
  }

  enviarDossier(): void {
    if (!this.puedeEnviar || this.enviando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Enviar dossier?',
      text: 'Una vez enviado SSOMA revisará los documentos.',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.enviando = true;
      this.loaderService.show();
      this.dossierService.enviarDossier(this.semanaId).subscribe({
        next: () => {
          this.enviando = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Dossier enviado', timer: 1500, showConfirmButton: false });
          this.closed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.enviando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  cerrar(): void {
    this.closed.emit(false);
  }
}
