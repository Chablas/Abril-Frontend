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
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  WorkerEntregableDto,
  WorkerEntregableUpdateDto,
  WorkerHabilitacionListDto,
  WorkerProyectoDto,
} from '../../dtos/trabajador.model';
import { environment } from '../../../../../environments/environment';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { CambiarObra } from './components/cambiar-obra/cambiar-obra';
import { VersionesDoc } from './components/versiones-doc/versiones-doc';
import { ReingresoForm } from './components/reingreso-form/reingreso-form';
import { WorkerCreateEdit } from './components/worker-create-edit/worker-create-edit';
import { HistorialEventos } from './components/historial-eventos/historial-eventos';
import { AgregarProyecto } from './components/agregar-proyecto/agregar-proyecto';
import { ProgramarInduccion } from './components/programar-induccion/programar-induccion';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';

@Component({
  selector: 'app-hab-trabajadores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Paginator, DocumentViewer, CambiarObra, VersionesDoc, ReingresoForm, HistorialEventos, AgregarProyecto, ProgramarInduccion, SearchSelect, WorkerCreateEdit],
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
  filtroProyectoId: number | null = null;
  soloRetirados = false;

  catalogoProyectos: ProjectGetDTO[] = [];
  catalogoEmpresas: EmpresaSimpleDto[] = [];

  panelVigencia = '';
  panelArchivoUrl = '';
  panelArchivoNombre = '';
  panelObsAbril = '';
  panelEstado = '';
  uploadingFile = false;

  drawerOpen = false;
  visorArchivoUrl = '';
  visorNombre = '';
  selectedIds: number[] = [];
  todosSeleccionados = false;
  modalCambiarObraOpen = false;
  modalVersionesOpen = false;
  versionesLoader = (id: number) => this.trabajadorHabService.getVersiones(id);
  modalWorkerOpen = false;
  modalWorkerMode: 'create' | 'edit' = 'create';
  workerParaEditar: WorkerHabilitacionListDto | null = null;
  mostrarReingreso = false;
  mostrarHistorial = false;
  mostrarAgregarProyecto = false;
  mostrarProgramarInduccion = false;
  workerParaAccion: WorkerHabilitacionListDto | null = null;
  workerParaReingreso: WorkerHabilitacionListDto | null = null;
  workerParaHistorial: WorkerHabilitacionListDto | null = null;
  workerSeleccionadoProyectos: WorkerProyectoDto[] = [];

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private catalogosService: CatalogosSaludService,
    private empresaContratistaService: EmpresaContratistaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.loadWorkers(1));
    this.loadWorkers(1);
    this.loadCatalogos();
  }

  private loadCatalogos(): void {
    const roles = this.authService.getRoles();
    const esContratista = this.authService.isContratista();
    console.log('[DIAG loadCatalogos] roles:', roles, '| esContratista:', esContratista);

    if (esContratista) {
      const empresaId = this.authService.getEmpresaId();
      console.log('[DIAG loadCatalogos] → rama CONTRATISTA | empresaId:', empresaId);
      if (empresaId) {
        this.empresaContratistaService.getProyectos(empresaId).subscribe({
          next: (res) => {
            this.catalogoProyectos = (res ?? []).map((p: any) => ({
              projectId: p.proyectoId,
              projectDescription: p.proyectoNombre,
            })) as unknown as ProjectGetDTO[];
            console.log('[DIAG loadCatalogos] CONTRATISTA proyectos:', this.catalogoProyectos.length);
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('[DIAG loadCatalogos] CONTRATISTA getProyectos ERROR:', err?.status, err?.message);
            this.catalogoProyectos = [];
          },
        });
      }
      return;
    }

    console.log('[DIAG loadCatalogos] → rama CASA/ADMIN — llamando getProjectsPaged y getEmpresas');
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.catalogoProyectos = res.data ?? [];
        console.log('[DIAG loadCatalogos] getProjectsPaged OK — items:', this.catalogoProyectos.length, '| totalRecords:', res.totalRecords);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[DIAG loadCatalogos] getProjectsPaged ERROR:', err?.status, err?.message, err);
        this.catalogoProyectos = [];
      },
    });
    this.catalogosService.getEmpresas().subscribe({
      next: (res) => {
        this.catalogoEmpresas = res ?? [];
        console.log('[DIAG loadCatalogos] getEmpresas OK — items:', this.catalogoEmpresas.length);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[DIAG loadCatalogos] getEmpresas ERROR:', err?.status, err?.message, err);
        this.catalogoEmpresas = [];
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkers(page: number = this.currentPage, afterLoad?: () => void): void {
    this.limpiarSeleccion();
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      search: this.search.trim() || undefined,
      estadoHabilitacion: this.filtroEstado || undefined,
      contratistaCasa: this.filtroContratistaCasa || undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      soloRetirados: this.soloRetirados || undefined,
    };
    this.trabajadorHabService.getTrabajadores(params).subscribe({
      next: (res) => {
        this.workers = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        afterLoad?.();
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
    this.cargarProyectos(worker.workerId);
  }

  cargarProyectos(workerId: number): void {
    this.trabajadorHabService.getProyectos(workerId).subscribe({
      next: (res) => {
        this.workerSeleccionadoProyectos = res ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.workerSeleccionadoProyectos = [];
        this.cdr.detectChanges();
      },
    });
  }

  abrirAgregarProyecto(worker: WorkerHabilitacionListDto): void {
    if (this.selectedWorker?.workerId !== worker.workerId) {
      this.selectWorker(worker);
    }
    this.mostrarAgregarProyecto = true;
  }

  onProyectoAgregado(dto: WorkerProyectoDto): void {
    this.workerSeleccionadoProyectos = [...this.workerSeleccionadoProyectos, dto];
    this.mostrarAgregarProyecto = false;
    this.loadWorkers(this.currentPage);
  }

  marcarInduccion(proyectoId: number): void {
    if (!this.selectedWorker) return;
    const workerId = this.selectedWorker.workerId;
    this.loaderService.show();
    this.trabajadorHabService.marcarInduccion(workerId, proyectoId).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Inducción registrada',
          timer: 1200,
          showConfirmButton: false,
        });
        this.cargarProyectos(workerId);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
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
    return this.authService.isContratista();
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
    if (!this.selectedEntregable || !this.selectedWorker) return;

    this.panelArchivoNombre = file.name;
    this.uploadingFile = true;
    this.cdr.detectChanges();

    const contexto = `habilitacion/trabajadores/${this.selectedWorker.workerId}`;
    this.sharepointService.subirArchivo(file, contexto).subscribe({
      next: (res) => {
        this.panelArchivoUrl = res.path;
        this.uploadingFile = false;
        input.value = '';
        this.autoMarcarEnviado();
        this.cdr.detectChanges();
      },
      error: () => {
        // Endpoint backend no implementado aún → fallback temporal
        this.panelArchivoUrl = `pending-upload://${file.name}`;
        this.uploadingFile = false;
        input.value = '';
        this.autoMarcarEnviado();
        this.cdr.detectChanges();
      },
    });
  }

  private autoMarcarEnviado(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    const payload: WorkerEntregableUpdateDto = {
      estado: 'Enviado',
      archivoUrl: this.panelArchivoUrl || undefined,
      vigencia: this.panelVigencia || undefined,
      obsContratista: this.isContratista() ? this.panelObsAbril || undefined : undefined,
      obsAbril: !this.isContratista() ? this.panelObsAbril || undefined : undefined,
    };

    this.trabajadorHabService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.actualizarEntregableLocal({
          estado: 'Enviado',
          archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
        });
        this.panelEstado = 'Enviado';
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
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

  get haySeleccionados(): boolean {
    return this.selectedIds.length > 0;
  }

  get programarInduccionEmpresaId(): number | null {
    if (this.selectedIds.length === 0) return null;
    return this.workers.find((w) => w.workerId === this.selectedIds[0])?.empresaId ?? null;
  }

  limpiarSeleccion(): void {
    this.selectedIds = [];
    this.todosSeleccionados = false;
  }

  toggleSeleccion(id: number): void {
    if (this.selectedIds.includes(id)) {
      this.selectedIds = this.selectedIds.filter((x) => x !== id);
    } else {
      this.selectedIds = [...this.selectedIds, id];
    }
    const activos = this.workers.filter((w) => w.estadoWorker !== 'RETIRADO');
    this.todosSeleccionados =
      activos.length > 0 && activos.every((w) => this.selectedIds.includes(w.workerId));
    this.cdr.detectChanges();
  }

  toggleTodos(): void {
    const activos = this.workers.filter((w) => w.estadoWorker !== 'RETIRADO');
    if (this.todosSeleccionados) {
      this.selectedIds = [];
      this.todosSeleccionados = false;
    } else {
      this.selectedIds = activos.map((w) => w.workerId);
      this.todosSeleccionados = true;
    }
    this.cdr.detectChanges();
  }

  retirar(worker: WorkerHabilitacionListDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Dar de baja?',
      text: `Se dará de baja a ${worker.apellidoNombre}. Puede revertirse con Reingreso.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.trabajadorHabService.retirarWorker(worker.workerId).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Trabajador dado de baja',
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

  retirarMasivo(): void {
    const n = this.selectedIds.length;
    Swal.fire({
      icon: 'warning',
      title: `¿Dar de baja a ${n} trabajador${n !== 1 ? 'es' : ''}?`,
      text: 'Esta acción puede revertirse individualmente con Reingreso.',
      showCancelButton: true,
      confirmButtonText: `Sí, dar de baja${n !== 1 ? ' a todos' : ''}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.trabajadorHabService.retirarWorkerMasivo([...this.selectedIds]).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: `${n} trabajador${n !== 1 ? 'es' : ''} dado${n !== 1 ? 's' : ''} de baja`,
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

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  abrirCambiarObra(worker: WorkerHabilitacionListDto): void {
    this.workerParaAccion = worker;
    this.modalCambiarObraOpen = true;
  }

  abrirReingreso(worker: WorkerHabilitacionListDto): void {
    this.workerParaReingreso = worker;
    this.mostrarReingreso = true;
  }

  onReingresoSaved(): void {
    this.mostrarReingreso = false;
    this.workerParaReingreso = null;
    this.loadWorkers(this.currentPage);
  }

  abrirHistorial(worker: WorkerHabilitacionListDto): void {
    this.workerParaHistorial = worker;
    this.mostrarHistorial = true;
  }

  onCambiarObraSaved(): void {
    this.modalCambiarObraOpen = false;
    const prevId = this.workerParaAccion?.workerId ?? this.selectedWorker?.workerId ?? null;
    this.workerParaAccion = null;
    this.loadWorkers(this.currentPage, () => {
      if (prevId) {
        const updated = this.workers.find((w) => w.workerId === prevId);
        if (updated) this.selectWorker(updated);
      }
    });
  }

  closeCambiarObra(): void {
    this.modalCambiarObraOpen = false;
    this.workerParaAccion = null;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  abrirCrear(): void {
    this.modalWorkerMode = 'create';
    this.workerParaEditar = null;
    this.modalWorkerOpen = true;
  }

  abrirEditar(worker: WorkerHabilitacionListDto): void {
    this.modalWorkerMode = 'edit';
    this.workerParaEditar = worker;
    this.modalWorkerOpen = true;
  }

  onWorkerSaved(): void {
    this.modalWorkerOpen = false;
    this.workerParaEditar = null;
    this.loadWorkers(this.currentPage);
  }

  onBuscarWorker(dni: string): void {
    this.modalWorkerOpen = false;
    this.search = dni;
    this.loadWorkers(1);
  }
}
