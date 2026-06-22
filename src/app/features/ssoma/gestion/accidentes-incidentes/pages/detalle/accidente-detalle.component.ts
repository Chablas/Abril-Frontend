import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { AccidenteIncidenteDetalleDto, DocumentoAdjuntoDto, SubirDocumentoRequest } from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-accidente-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './accidente-detalle.component.html',
  styleUrl: './accidente-detalle.component.css',
})
export class AccidenteDetalleComponent implements OnInit {
  id!: number;
  detalle: AccidenteIncidenteDetalleDto | null = null;
  loading = true;

  subiendoDoc = false;
  docVisorUrl: SafeResourceUrl | null = null;
  docVisorNombre = '';
  docVisorTipo = '';
  docVisorAbierto = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getDetalle(this.id).subscribe({
      next: (res) => {
        this.detalle = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  irAEditar(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes/lista']);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const request: SubirDocumentoRequest = {
        nombreArchivo: file.name,
        tipoArchivo: file.type,
        tamanioBytes: file.size,
        contenidoBase64: base64,
      };
      this.subiendoDoc = true;
      this.cdr.detectChanges();
      this.service.subirDocumento(this.id, request).subscribe({
        next: () => {
          this.subiendoDoc = false;
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.subiendoDoc = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  abrirVisor(doc: DocumentoAdjuntoDto): void {
    this.docVisorNombre = doc.nombreArchivo;
    this.docVisorTipo = doc.tipoArchivo;
    const esPdf = doc.tipoArchivo === 'application/pdf' || doc.nombreArchivo.toLowerCase().endsWith('.pdf');
    this.docVisorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(doc.urlSharepoint);
    this.docVisorAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarVisor(): void {
    this.docVisorAbierto = false;
    this.docVisorUrl = null;
    this.cdr.detectChanges();
  }

  esImagen(tipoArchivo: string): boolean {
    return tipoArchivo.startsWith('image/');
  }

  esPdf(tipoArchivo: string, nombre: string): boolean {
    return tipoArchivo === 'application/pdf' || nombre.toLowerCase().endsWith('.pdf');
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  tipoClass(tipo: string): string {
    return tipo === 'Accidente' ? 'tipo-accidente' : 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Cerrado') return 'estado-cerrado';
    if (estado === 'En Investigación') return 'estado-investigacion';
    return 'estado-abierto';
  }
}
