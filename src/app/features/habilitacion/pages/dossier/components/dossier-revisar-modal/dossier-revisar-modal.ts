import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { DossierService } from '../../../../services/dossier.service';
import { SharepointUploadService } from '../../../../services/sharepoint-upload.service';
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
  selector: 'app-dossier-revisar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dossier-revisar-modal.html',
  styleUrl: './dossier-revisar-modal.css',
})
export class DossierRevisarModal implements OnInit, OnDestroy {
  @Input() semanaId!: number;
  @Output() closed = new EventEmitter<boolean>();

  detalle: DossierSemanaDetalleDto | null = null;
  loading = true;
  guardando = false;
  comentario = '';
  modoObservar = false;

  docSafeUrl: SafeResourceUrl | null = null;
  loadingDoc = false;
  visorNombre = '';
  private docBlobUrl = '';

  readonly tipos = DOSSIER_TIPOS;

  constructor(
    private dossierService: DossierService,
    private sharepointService: SharepointUploadService,
    private sanitizer: DomSanitizer,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.dossierService.getDetalle(this.semanaId).subscribe({
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

  ngOnDestroy(): void {
    this.revokeBlobUrl();
  }

  getDoc(tipo: DossierTipoDocumento): DossierDocumentoDto | undefined {
    return this.detalle?.documentos.find((d) => d.tipoDoc === tipo);
  }

  chipDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'chip-green';
    if (estado === 'NA') return 'chip-gray';
    return 'chip-blue';
  }

  chipSemana(estado: string): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Rechazado' || estado === 'Enviado') return 'chip-orange';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  getArchivoPath(doc: DossierDocumentoDto): string | null {
    return doc.archivoPath ?? doc.archivos?.[doc.archivos.length - 1]?.archivoPath ?? null;
  }

  verArchivo(doc: DossierDocumentoDto, path?: string): void {
    const p = path ?? this.getArchivoPath(doc);
    if (!p) return;
    this.visorNombre = doc.nombreArchivo ?? doc.tipoDoc;
    this.loadingDoc = true;
    this.docSafeUrl = null;
    this.cdr.detectChanges();
    this.sharepointService.getArchivoUrl(p, 'dossier-semanal').subscribe({
      next: (res) => {
        fetch(res.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            this.revokeBlobUrl();
            this.docBlobUrl = URL.createObjectURL(blob);
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.docBlobUrl);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          });
      },
      error: () => {
        this.loadingDoc = false;
        this.cdr.detectChanges();
      },
    });
  }

  private revokeBlobUrl(): void {
    if (this.docBlobUrl) {
      URL.revokeObjectURL(this.docBlobUrl);
      this.docBlobUrl = '';
    }
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
    this.guardar('Rechazado', this.comentario.trim());
  }

  private guardar(estado: string, obsRevisor?: string): void {
    this.guardando = true;
    this.loaderService.show();
    this.dossierService.revisar(this.semanaId, { estado, obsRevisor: obsRevisor ?? null }).subscribe({
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
