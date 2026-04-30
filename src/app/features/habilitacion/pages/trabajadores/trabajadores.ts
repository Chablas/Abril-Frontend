import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import {
  WorkerEntregableDto,
  WorkerEntregableUpdateDto,
  WorkerHabilitacionListDto,
} from '../../dtos/trabajador.model';
import { environment } from '../../../../../environments/environment';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { CambiarObra } from './components/cambiar-obra/cambiar-obra';
import { VersionesDoc } from './components/versiones-doc/versiones-doc';

@Component({
  selector: 'app-hab-trabajadores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Paginator, DocumentViewer, CambiarObra, VersionesDoc],
  templateUrl: './trabajadores.html',
  styleUrl: './trabajadores.css',
})
export class Trabajadores implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly pageSize = 20;

  workers: WorkerHabilitacionListDto[] = [];
  selectedWorker: WorkerHabilitacionListDto | null = null;
  entregables: WorkerEntregableDto[] = [];
  selectedEntregable: WorkerEntregableDto | null = null;

  loading = false;
  loadingEntregables = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  search = '';
  filtroEstado = '';
  filtroContratistaCasa = '';
  filtroEmpresaId: number | null = null;

  panelVigencia = '';
  panelArchivoUrl = '';
  panelArchivoNombre = '';
  panelObsAbril = '';
  panelEstado = '';
  uploadingFile = false;

  drawerOpen = false;
  visorArchivoUrl = '';
  visorNombre = '';
  modalCambiarObraOpen = false;
  modalVersionesOpen = false;
  workerParaAccion: WorkerHabilitacionListDto | null = null;

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.loadWorkers(1));
    this.loadWorkers(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkers(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      search: this.search.trim() || undefined,
      estado: this.filtroEstado || undefined,
      contratistaCasa: this.filtroContratistaCasa || undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
    };
    this.trabajadorHabService.getTrabajadores(params).subscribe({
      next: (res) => {
        this.workers = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
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

  selectWorker(worker: WorkerHabilitacionListDto): void {
    this.selectedWorker = worker;
    this.selectedEntregable = null;
    this.resetPanel();
    this.loadEntregables(worker.workerId);
  }

  loadEntregables(workerId: number): void {
    this.loadingEntregables = true;
    this.entregables = [];
    this.trabajadorHabService.getEntregables(workerId).subscribe({
      next: (res) => {
        this.entregables = res ?? [];
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEntregables = false;
        this.errorService.handleError(err);
      },
    });
  }

  selectEntregable(e: WorkerEntregableDto): void {
    this.selectedEntregable = e;
    this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
    this.panelArchivoUrl = e.archivoUrl ?? '';
    this.panelArchivoNombre = e.archivoUrl ? this.extractFileName(e.archivoUrl) : '';
    this.panelObsAbril = e.obsAbril ?? '';
    this.panelEstado = e.estado;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedEntregable = null;
    this.resetPanel();
  }

  private extractFileName(url: string): string {
    try {
      const parts = url.split(/[\\/]/);
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  private resetPanel(): void {
    this.panelVigencia = '';
    this.panelArchivoUrl = '';
    this.panelArchivoNombre = '';
    this.panelObsAbril = '';
    this.panelEstado = '';
  }

  onSearch(): void {
    this.searchChange$.next();
  }

  onFilterChange(): void {
    this.loadWorkers(1);
  }

  onPageChange(page: number): void {
    this.loadWorkers(page);
  }

  isContratista(): boolean {
    return this.authService.hasRole('CONTRATISTA');
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP') ||
      this.authService.hasRole('ADMINISTRADOR ADMINISTRACION')
    );
  }

  isSSoma(): boolean {
    return this.authService.hasRole('ADMINISTRADOR SSOMA');
  }

  isAdministracion(): boolean {
    return this.authService.hasRole('ADMINISTRADOR ADMINISTRACION');
  }

  esSoloLectura(e: WorkerEntregableDto | null): boolean {
    if (!e) return false;
    return (e.obsAbril ?? '').trim() === 'Gestionado por módulo SSOMA';
  }

  esSctrVidaley(e: WorkerEntregableDto | null): boolean {
    return !!e?.esSctrVidaley;
  }

  esEmo(e: WorkerEntregableDto): boolean {
    return e.nombreItem.toLowerCase().includes('emo');
  }

  workerEsCasa(): boolean {
    return this.selectedWorker?.contrataCasa === 'Casa';
  }

  esSoloLecturaPanel(e: WorkerEntregableDto): boolean {
    return this.esSctrVidaley(e) || this.esSoloLectura(e) || (this.esEmo(e) && this.workerEsCasa());
  }

  puedeEditar(_e: WorkerEntregableDto): boolean {
    return !this.isContratista();
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Habilitado':
        return 'btn-chip chip-green';
      case 'Autorizado Temporalmente':
        return 'btn-chip chip-orange';
      case 'No Autorizado':
        return 'btn-chip chip-red';
      default:
        return 'btn-chip chip-gray';
    }
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Enviado':
        return 'chip-orange';
      case 'Rechazado':
        return 'chip-orange';
      case 'No Aplica':
        return 'chip-gray';
      case 'Falta':
      default:
        return 'chip-gray';
    }
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'falta' || norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'no aplica') return 'dot-no-aplica';
    return 'dot-no-aplica';
  }

  nombreArchivo(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visorArchivoUrl) this.onVisorClosed();
    else if (this.drawerOpen) this.closeDrawer();
  }

  abrirVisor(archivoUrl: string): void {
    this.visorNombre = this.nombreArchivo(archivoUrl);
    this.visorArchivoUrl = archivoUrl;
  }

  onVisorClosed(): void {
    this.visorArchivoUrl = '';
  }

  abrirDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  descargarDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = this.nombreArchivo(archivoUrl);
        a.click();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private actualizarEntregableLocal(updates: Partial<WorkerEntregableDto>): void {
    if (!this.selectedEntregable) return;
    const idx = this.entregables.findIndex((e) => e.id === this.selectedEntregable!.id);
    if (idx !== -1) {
      this.entregables[idx] = { ...this.entregables[idx], ...updates };
      this.selectedEntregable = this.entregables[idx];
    }
    this.cdr.detectChanges();
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

    const contexto = `habilitacion/trabajadores/${this.selectedWorker?.workerId ?? 'sin-worker'}`;
    this.sharepointService.subirArchivo(file, contexto).subscribe({
      next: (res) => {
        this.panelArchivoUrl = res.url;
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      },
      error: () => {
        // Endpoint backend no implementado aún → fallback temporal
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
    if (!this.selectedEntregable || !this.selectedWorker) return;

    let nuevoEstado = this.selectedEntregable.estado;
    if (this.isContratista()) {
      nuevoEstado = 'Enviado';
    } else if (this.isAdmin() && this.selectedEntregable.estado === 'Falta') {
      nuevoEstado = 'Enviado';
    }

    const payload: WorkerEntregableUpdateDto = {
      estado: nuevoEstado,
      vigencia: this.panelVigencia || undefined,
      archivoUrl: this.panelArchivoUrl || undefined,
      obsContratista: this.isContratista() ? this.panelObsAbril : undefined,
    };

    this.loaderService.show();
    this.trabajadorHabService
      .updateEntregable(this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Enviado',
            text: 'Documento enviado.',
            timer: 1500,
            showConfirmButton: false,
          });
          this.actualizarEntregableLocal({
            estado: 'Enviado',
            archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  guardarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    const vigencia = !this.selectedEntregable.requiereVigencia
      ? '2040-12-31'
      : this.panelVigencia || undefined;

    const payload: WorkerEntregableUpdateDto = {
      estado: this.panelEstado,
      vigencia,
      archivoUrl: this.panelArchivoUrl || undefined,
      obsAbril: this.panelObsAbril || undefined,
    };

    this.loaderService.show();
    this.trabajadorHabService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        const vigencia = !this.selectedEntregable?.requiereVigencia
          ? '2040-12-31'
          : this.panelVigencia || undefined;
        this.actualizarEntregableLocal({
          estado: this.panelEstado,
          vigencia,
          archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
          obsAbril: this.panelObsAbril || undefined,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  aprobarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedWorker) return;
      this.loaderService.show();
      this.trabajadorHabService
        .updateEntregable(this.selectedEntregable.id, {
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
            if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  rechazarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Describe el motivo…',
      inputAttributes: { 'aria-label': 'Motivo del rechazo' },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedWorker) return;
      this.loaderService.show();
      this.trabajadorHabService
        .updateEntregable(this.selectedEntregable.id, {
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
            if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  abrirCambiarObra(worker: WorkerHabilitacionListDto): void {
    this.workerParaAccion = worker;
    this.modalCambiarObraOpen = true;
  }

  abrirReingreso(worker: WorkerHabilitacionListDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Reingresar trabajador?',
      text: `Reingresar a ${worker.apellidoNombre} en ${worker.proyectoActual ?? 'el proyecto actual'}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, reingresar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      if (!worker.proyectoActualId || !worker.empresaId) {
        Swal.fire({
          icon: 'warning',
          title: 'Datos faltantes',
          text: 'No se conoce el proyecto o empresa del trabajador.',
        });
        return;
      }
      this.loaderService.show();
      this.trabajadorHabService
        .reingreso(worker.workerId, worker.proyectoActualId, worker.empresaId)
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Trabajador reingresado',
              timer: 1500,
              showConfirmButton: false,
            });
            this.loadWorkers(this.currentPage);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  onCambiarObraSaved(): void {
    this.modalCambiarObraOpen = false;
    this.workerParaAccion = null;
    this.loadWorkers(this.currentPage);
  }

  closeCambiarObra(): void {
    this.modalCambiarObraOpen = false;
    this.workerParaAccion = null;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }
}
