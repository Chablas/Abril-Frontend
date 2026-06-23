import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { FlashReportDetalleDto, NIVELES_CONSECUENCIA } from '../../accidente-incidente.dtos';
import { environment } from '../../../../../../../environments/environment';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { EntregablesTabComponent } from './entregables-tab/entregables-tab.component';
import { Rm050TabComponent } from './rm050-tab/rm050-tab.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent, EntregablesTabComponent, Rm050TabComponent],
  templateUrl: './accidente-detalle.component.html',
  styleUrl: './accidente-detalle.component.css',
})
export class AccidenteDetalleComponent implements OnInit {
  id!: number;
  detalle: FlashReportDetalleDto | null = null;
  loading = true;
  enviando = false;
  foto1Blob: string | null = null;
  foto2Blob: string | null = null;
  tabActiva: 'flash' | 'entregables' | 'rm050' = 'flash';

  setTab(tab: 'flash' | 'entregables' | 'rm050'): void {
    this.tabActiva = tab;
    this.cdr.detectChanges();
  }

  readonly nivelesConsecuencia = NIVELES_CONSECUENCIA;

  private cargarBlobFoto(path: string, slot: 1 | 2): void {
    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(path)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (slot === 1) this.foto1Blob = blobUrl;
        else this.foto2Blob = blobUrl;
        this.cdr.detectChanges();
      });
  }

  private fetchArchivo(path: string, download: boolean): void {
    const token = localStorage.getItem('access_token');
    const endpoint = download ? 'descargar' : 'ver';
    const url = `${environment.apiUrl}api/v1/habilitacion/archivos/${endpoint}?url=${encodeURIComponent(path)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const mime = download ? blob.type : (blob.type || 'application/pdf');
        const typed = new Blob([blob], { type: mime });
        const blobUrl = URL.createObjectURL(typed);
        if (download) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = path.split('/').pop() ?? 'archivo';
          a.click();
        } else {
          window.open(blobUrl, '_blank');
        }
      });
  }

  abrirArchivo(path: string): void { this.fetchArchivo(path, false); }
  descargarArchivo(path: string): void { this.fetchArchivo(path, true); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
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
        if (res.urlFoto1) this.cargarBlobFoto(res.urlFoto1, 1);
        if (res.urlFoto2) this.cargarBlobFoto(res.urlFoto2, 2);
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

  async confirmarEnviar(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Enviar Flash Report?',
      html: `Se generará el PDF del Flash Report <strong>${this.detalle?.codigo}</strong>, se subirá a SharePoint y se enviará por correo a SSOMA y Proyectos.<br><br>Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1b3a2d',
    });
    if (!result.isConfirmed) return;

    this.enviando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    this.service.enviar(this.id).subscribe({
      next: async (res) => {
        this.enviando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: 'Flash Report enviado',
          text: res.message,
          timer: 2500,
          showConfirmButton: false,
        });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  nivelLabel(n?: number): string {
    return n && n >= 1 && n <= 6 ? this.nivelesConsecuencia[n] : '—';
  }

  nivelClass(n?: number): string {
    if (!n) return '';
    if (n <= 2) return 'nivel-bajo';
    if (n <= 3) return 'nivel-medio';
    if (n <= 4) return 'nivel-alto';
    return 'nivel-critico';
  }

  tipoClass(codigo: string): string {
    const map: Record<string, string> = { AC: 'tipo-accidente', IN: 'tipo-incidente', NC: 'tipo-nc', AL: 'tipo-alerta' };
    return map[codigo] ?? 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Enviado') return 'estado-enviado';
    return 'estado-borrador';
  }
}
