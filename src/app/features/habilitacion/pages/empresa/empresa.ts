import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HabEmpresaService } from '../../services/hab-empresa.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import {
  EmpresaContratistaListDto,
  EmpresaEntregableDto,
  EmpresaEntregableUpdateDto,
  EmpresaProyectoDto,
} from '../../dtos/empresa.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hab-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresa.html',
  styleUrl: './empresa.css',
})
export class Empresa implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  empresaId: number | null = null;
  proyectoId: number | null = null;
  mes: number = new Date().getMonth() + 1;
  anio: number = new Date().getFullYear();

  empresas: EmpresaContratistaListDto[] = [];
  proyectos: EmpresaProyectoDto[] = [];

  entregables: EmpresaEntregableDto[] = [];
  selectedEntregable: EmpresaEntregableDto | null = null;
  loading = false;

  panelArchivoUrl = '';
  panelArchivoNombre = '';
  panelVigencia = '';
  panelObsAbril = '';
  panelObsContratista = '';
  uploadingFile = false;

  meses = [
    { num: 1, label: 'Enero' },
    { num: 2, label: 'Febrero' },
    { num: 3, label: 'Marzo' },
    { num: 4, label: 'Abril' },
    { num: 5, label: 'Mayo' },
    { num: 6, label: 'Junio' },
    { num: 7, label: 'Julio' },
    { num: 8, label: 'Agosto' },
    { num: 9, label: 'Septiembre' },
    { num: 10, label: 'Octubre' },
    { num: 11, label: 'Noviembre' },
    { num: 12, label: 'Diciembre' },
  ];

  constructor(
    private habEmpresaService: HabEmpresaService,
    private empresaContratistaService: EmpresaContratistaService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.isContratista()) {
      const empresaIdJwt = this.readEmpresaIdFromJwt();
      if (empresaIdJwt) {
        this.empresaId = empresaIdJwt;
        this.loadProyectosDeEmpresa(empresaIdJwt);
      }
    } else if (this.isAdmin()) {
      this.loadEmpresasAdmin();
    }
  }

  private readEmpresaIdFromJwt(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      const raw = decoded?.empresaId ?? decoded?.['empresaId'];
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? num : null;
    } catch {
      return null;
    }
  }

  isContratista(): boolean {
    return this.authService.hasRole('CONTRATISTA');
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP')
    );
  }

  private loadEmpresasAdmin(): void {
    this.empresaContratistaService.getEmpresas({ pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresas = [];
      },
    });
  }

  private loadProyectosDeEmpresa(empresaId: number): void {
    this.proyectos = [];
    this.proyectoId = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.habEmpresaService.getProyectos(empresaId).subscribe({
      next: (res) => {
        this.proyectos = res ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
      },
    });
  }

  onEmpresaChange(): void {
    if (!this.empresaId) {
      this.proyectos = [];
      this.proyectoId = null;
      this.entregables = [];
      this.selectedEntregable = null;
      return;
    }
    this.loadProyectosDeEmpresa(this.empresaId);
  }

  loadEntregables(): void {
    if (!this.empresaId || !this.proyectoId) return;
    this.loading = true;
    this.loaderService.show();
    this.entregables = [];
    this.selectedEntregable = null;
    this.resetPanel();
    this.habEmpresaService
      .getEntregables(this.empresaId, this.proyectoId, this.mes, this.anio)
      .subscribe({
        next: (res) => {
          this.entregables = res ?? [];
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  selectEntregable(e: EmpresaEntregableDto): void {
    this.selectedEntregable = e;
    this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
    this.panelArchivoUrl = e.archivoUrl ?? '';
    this.panelArchivoNombre = e.archivoUrl ? this.extractFileName(e.archivoUrl) : '';
    this.panelObsAbril = e.obsAbril ?? '';
    this.panelObsContratista = e.obsContratista ?? '';
  }

  private extractFileName(url: string): string {
    const parts = url.split(/[\\/]/);
    return parts[parts.length - 1] || url;
  }

  private resetPanel(): void {
    this.panelArchivoUrl = '';
    this.panelArchivoNombre = '';
    this.panelVigencia = '';
    this.panelObsAbril = '';
    this.panelObsContratista = '';
  }

  getEntregablesPorResponsable(responsable: string): EmpresaEntregableDto[] {
    return this.entregables.filter(
      (e) => (e.responsable || '').toUpperCase() === responsable.toUpperCase(),
    );
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'falta' || norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'no aplica') return 'dot-no-aplica';
    return 'dot-no-aplica';
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Enviado':
      case 'Rechazado':
        return 'chip-orange';
      case 'No Aplica':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  getViewUrl(url: string): string {
    return `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.panelArchivoNombre = file.name;
    this.uploadingFile = true;
    this.cdr.detectChanges();

    const contexto = `habilitacion/empresas/${this.empresaId ?? 'sin-empresa'}`;
    this.sharepointService.subirArchivo(file, contexto).subscribe({
      next: (res) => {
        this.panelArchivoUrl = res.url;
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.panelArchivoUrl = `pending-upload://${file.name}`;
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  clearArchivo(): void {
    this.panelArchivoUrl = '';
    this.panelArchivoNombre = '';
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.empresaId) return;

    let nuevoEstado = this.selectedEntregable.estado;
    if (this.isContratista()) {
      nuevoEstado = 'Enviado';
    } else if (this.isAdmin() && this.selectedEntregable.estado === 'Falta') {
      nuevoEstado = 'Enviado';
    }

    const payload: EmpresaEntregableUpdateDto = {
      estado: nuevoEstado,
      vigencia: this.panelVigencia || undefined,
      archivoUrl: this.panelArchivoUrl || undefined,
      obsContratista: this.isContratista() ? this.panelObsContratista : undefined,
    };

    this.loaderService.show();
    this.habEmpresaService
      .updateEntregable(this.empresaId, this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Enviado',
            timer: 1500,
            showConfirmButton: false,
          });
          this.loadEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  aprobarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService
        .updateEntregable(this.empresaId, this.selectedEntregable.id, {
          estado: 'Aprobado',
          obsAbril: this.panelObsAbril || undefined,
          vigencia: this.panelVigencia || undefined,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Aprobado',
              timer: 1500,
              showConfirmButton: false,
            });
            this.loadEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  rechazarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService
        .updateEntregable(this.empresaId, this.selectedEntregable.id, {
          estado: 'Rechazado',
          obsAbril: res.value,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Rechazado',
              timer: 1500,
              showConfirmButton: false,
            });
            this.loadEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }
}
