import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import { SctrVidaLeyService } from '../../services/sctr-vidaley.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import {
  SctrVidaLeyDto,
  SctrWorkerDto,
  SctrTrabajadorEstadoDto,
  SctrVidaLeyAprobarDto,
} from '../../dtos/sctr.model';
import { WorkerEntregableUpdateDto } from '../../dtos/trabajador.model';
import { CatalogosSaludService } from '../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { environment } from '../../../../../environments/environment';
import { SctrSubir } from './components/sctr-subir/sctr-subir';
import { SctrAprobar } from './components/sctr-aprobar/sctr-aprobar';
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';

type ActiveTab = 'polizas' | 'trabajadores';

@Component({
  selector: 'app-hab-sctr-vidaley',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SearchSelect, SctrSubir, SctrAprobar, VersionesDoc],
  templateUrl: './sctr-vidaley.html',
  styleUrl: './sctr-vidaley.css',
})
export class SctrVidaley implements OnInit, OnDestroy {
  readonly pageSize = 20;

  // ── Tab ──────────────────────────────────────────────────
  activeTab: ActiveTab = 'polizas';

  // ── Tab Pólizas ──────────────────────────────────────────
  documentos: SctrVidaLeyDto[] = [];
  selectedDoc: SctrVidaLeyDto | null = null;
  docSafeUrl: SafeResourceUrl | null = null;
  private docBlobUrl = '';
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroTipo = '';
  filtroEstado = '';
  filtroMes: number | null = null;
  filtroAnio: number = new Date().getFullYear();
  filtroEmpresaId: number | null = null;
  filtroObraOficina = '';

  modalSubirOpen = false;
  modalAprobarOpen = false;
  modalVersionesOpen = false;
  modalVersionesPolizaOpen = false;
  selectedPolizaWorker: SctrWorkerDto | null = null;
  versionesLoader = (id: number) => this.trabajadorHabService.getVersiones(id);

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

  // ── Shared — empresas (Tab 1 + Tab 2) ────────────────────
  empresas: EmpresaSimpleDto[] = [];

  // ── Tab Trabajadores — lista ──────────────────────────────
  proyectos: ProjectGetDTO[] = [];
  trabajadores: SctrTrabajadorEstadoDto[] = [];
  selectedWorker: SctrTrabajadorEstadoDto | null = null;
  loadingWorkers = false;
  workersTabInitialized = false;

  wFiltroEmpresaId: number | null = null;
  wFiltroProyectoId: number | null = null;
  wFiltroEstado = 'Enviado';
  wFiltroTipo: 'SCTR' | 'VIDA_LEY' = 'SCTR';

  // ── Tab Trabajadores — panel derecho ──────────────────────
  selectedPoliza: SctrVidaLeyDto | null = null;
  loadingPoliza = false;
  polizaSafeUrl: SafeResourceUrl | null = null;
  private polizaBlobUrl = '';
  polizaWorkersSeleccionados = new Set<number>();
  motivoRechazo = '';
  savingAprobar = false;

  private filterChange$ = new Subject<void>();
  private workerFilterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private sctrService: SctrVidaLeyService,
    private sharepointService: SharepointUploadService,
    private trabajadorHabService: TrabajadorHabService,
    private authService: AuthService,
    private projectService: ProjectService,
    private catalogosService: CatalogosSaludService,
    private sanitizer: DomSanitizer,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadDocumentos(1));

    this.workerFilterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadTrabajadores());

    if (this.isAdmin()) {
      this.catalogosService.getEmpresas().subscribe({
        next: (res) => {
          this.empresas = res ?? [];
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }

    if (this.isContratista()) {
      const id = this.authService.getEmpresaId();
      if (id) this.filtroEmpresaId = id;
    }

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const tab = params.get('tab') as ActiveTab | null;
      this.activeTab = tab === 'trabajadores' ? 'trabajadores' : 'polizas';
      if (this.activeTab === 'trabajadores' && !this.workersTabInitialized) {
        this.initTrabajadoresTab();
      }
    });

    this.loadDocumentos(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeBlobUrl();
    this.revokeDocBlobUrl();
  }

  // ── Tabs ─────────────────────────────────────────────────

  switchTab(tab: ActiveTab): void {
    this.router.navigate([], { queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  private initTrabajadoresTab(): void {
    this.workersTabInitialized = true;
    this.projectService.getProjectPaged(1).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
      },
    });
    if (!this.isAdmin()) {
      const id = this.readEmpresaIdFromJwt();
      if (id) this.wFiltroEmpresaId = id;
    }
    this.loadTrabajadores();
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

  // ── Tab Pólizas ──────────────────────────────────────────

  loadDocumentos(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tipo: this.filtroTipo || undefined,
      estado: this.filtroEstado || undefined,
      mes: this.filtroMes ?? undefined,
      anio: this.filtroAnio || undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
      obraOficina: this.filtroObraOficina || undefined,
    };
    this.sctrService.getList(params).subscribe({
      next: (res) => {
        this.documentos = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        if (this.selectedDoc) {
          const refreshed = this.documentos.find((d) => d.id === this.selectedDoc?.id);
          this.selectedDoc = refreshed ?? null;
          if (!this.selectedDoc) this.clearDocPanel();
        }
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

  onFilter(): void {
    this.filterChange$.next();
  }

  onPolizaEmpresaChange(val: number | null): void {
    this.filtroEmpresaId = val;
    if (!this.selectedEmpresaEsAbril) {
      this.filtroObraOficina = '';
    }
    this.onFilter();
  }

  onPageChange(page: number): void {
    this.loadDocumentos(page);
  }

  selectDoc(doc: SctrVidaLeyDto): void {
    if (this.selectedDoc?.id === doc.id) return;
    this.clearDocPanel();
    this.selectedDoc = doc;
    if (doc.archivoUrl) {
      this.loadDocBlob(doc.archivoUrl);
    }
  }

  selectPolizaWorker(w: SctrWorkerDto): void {
    this.selectedPolizaWorker =
      this.selectedPolizaWorker?.workerId === w.workerId ? null : w;
  }

  private clearDocPanel(): void {
    this.docSafeUrl = null;
    this.revokeDocBlobUrl();
    this.selectedPolizaWorker = null;
  }

  private revokeDocBlobUrl(): void {
    if (this.docBlobUrl) {
      URL.revokeObjectURL(this.docBlobUrl);
      this.docBlobUrl = '';
    }
  }

  private loadDocBlob(archivoUrl: string): void {
    this.docSafeUrl = null;
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        fetch(res.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            this.revokeDocBlobUrl();
            this.docBlobUrl = URL.createObjectURL(blob);
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.docBlobUrl);
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
            this.cdr.detectChanges();
          });
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  get selectedEmpresaEsAbril(): boolean {
    if (!this.filtroEmpresaId) return false;
    return this.empresas.find((e) => e.id === this.filtroEmpresaId)?.esAbril ?? false;
  }

  abrirSubir(): void {
    this.modalSubirOpen = true;
  }

  closeSubir(): void {
    this.modalSubirOpen = false;
  }

  onSubirSaved(): void {
    this.modalSubirOpen = false;
    this.loadDocumentos(this.currentPage);
  }

  abrirAprobar(): void {
    if (!this.selectedDoc) return;
    this.modalAprobarOpen = true;
  }

  closeAprobar(): void {
    this.modalAprobarOpen = false;
  }

  onAprobarSaved(): void {
    this.modalAprobarOpen = false;
    this.loadDocumentos(this.currentPage);
  }

  // ── Tab Trabajadores — lista ──────────────────────────────

  loadTrabajadores(): void {
    this.loadingWorkers = true;
    this.trabajadores = [];
    this.clearPolizaPanel();
    const estadoParam =
      this.wFiltroTipo === 'VIDA_LEY'
        ? { estadoVidaLey: this.wFiltroEstado || undefined }
        : { estadoSctr: this.wFiltroEstado || undefined };
    this.sctrService
      .getTrabajadoresPorEmpresa({
        empresaId: this.wFiltroEmpresaId ?? undefined,
        proyectoId: this.wFiltroProyectoId ?? undefined,
        tipo: this.wFiltroTipo,
        ...estadoParam,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.trabajadores = res ?? [];
          this.loadingWorkers = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingWorkers = false;
          this.cdr.detectChanges();
        },
      });
  }

  onWorkerFilter(): void {
    this.workerFilterChange$.next();
  }

  onTipoChange(): void {
    this.wFiltroEstado = 'Enviado';
    this.workerFilterChange$.next();
  }

  selectWorker(w: SctrTrabajadorEstadoDto): void {
    console.log('[Tab2] selectWorker', w.apellidoNombre, '| sctrId:', w.sctrId);
    this.selectedWorker = w;
    this.clearPolizaPanel();
    if (w.sctrId) {
      this.loadPoliza(w.sctrId);
    }
  }

  // ── Tab Trabajadores — panel derecho ──────────────────────

  private loadPoliza(sctrId: number): void {
    console.log('[Tab2] loadPoliza id:', sctrId);
    this.loadingPoliza = true;
    this.sctrService
      .getById(sctrId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (poliza) => {
          console.log('[Tab2] poliza cargada id:', poliza.id, '| tipo:', poliza.tipo);
          console.log('archivoUrl:', poliza.archivoUrl);
          console.log('archivoUrl2:', poliza.archivoUrl2);
          this.selectedPoliza = poliza;
          const preselect =
            this.wFiltroTipo === 'VIDA_LEY'
              ? poliza.workers.filter((w) => w.estadoVidaLey === 'Enviado').map((w) => w.workerId)
              : poliza.workers.filter((w) => w.estadoSctr === 'Enviado').map((w) => w.workerId);
          this.polizaWorkersSeleccionados = new Set(preselect);
          console.log('polizaWorkersSeleccionados (ids):', [...this.polizaWorkersSeleccionados]);
          const archivoVisor =
            this.wFiltroTipo === 'VIDA_LEY'
              ? (poliza.archivoUrl2 ?? poliza.archivoUrl)
              : poliza.archivoUrl;
          if (archivoVisor) {
            this.loadPolizaBlob(archivoVisor);
          }
          this.loadingPoliza = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Tab2] loadPoliza error:', err);
          this.loadingPoliza = false;
          this.cdr.detectChanges();
        },
      });
  }

  private clearPolizaPanel(): void {
    this.selectedPoliza = null;
    this.polizaSafeUrl = null;
    this.revokeBlobUrl();
    this.polizaWorkersSeleccionados = new Set();
    this.motivoRechazo = '';
  }

  private loadPolizaBlob(archivoUrl: string): void {
    this.polizaSafeUrl = null;
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        fetch(res.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            this.revokeBlobUrl();
            this.polizaBlobUrl = URL.createObjectURL(blob);
            this.polizaSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.polizaBlobUrl);
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.polizaSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
            this.cdr.detectChanges();
          });
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  private revokeBlobUrl(): void {
    if (this.polizaBlobUrl) {
      URL.revokeObjectURL(this.polizaBlobUrl);
      this.polizaBlobUrl = '';
    }
  }

  togglePolizaWorker(workerId: number): void {
    if (this.polizaWorkersSeleccionados.has(workerId)) {
      this.polizaWorkersSeleccionados.delete(workerId);
    } else {
      this.polizaWorkersSeleccionados.add(workerId);
    }
  }

  toggleAllPolizaWorkers(checked: boolean): void {
    if (!this.selectedPoliza) return;
    if (checked) {
      this.selectedPoliza.workers.forEach((w) => this.polizaWorkersSeleccionados.add(w.workerId));
    } else {
      this.polizaWorkersSeleccionados.clear();
    }
  }

  get polizaAllChecked(): boolean {
    const workers = this.selectedPoliza?.workers ?? [];
    return (
      workers.length > 0 && workers.every((w) => this.polizaWorkersSeleccionados.has(w.workerId))
    );
  }

  get polizaSomeChecked(): boolean {
    const workers = this.selectedPoliza?.workers ?? [];
    return workers.some((w) => this.polizaWorkersSeleccionados.has(w.workerId));
  }

  get canAprobar(): boolean {
    return !this.savingAprobar && this.polizaWorkersSeleccionados.size > 0 && !!this.selectedPoliza;
  }

  get canRechazar(): boolean {
    return !this.savingAprobar && this.polizaWorkersSeleccionados.size > 0 && !!this.selectedPoliza;
  }

  aprobarSeleccionados(): void {
    if (!this.canAprobar || !this.selectedPoliza) return;
    this.savingAprobar = true;
    const dto: SctrVidaLeyAprobarDto = {
      workerIdsAprobados: Array.from(this.polizaWorkersSeleccionados),
      workerIdsRechazados: [],
      vigencia: this.selectedPoliza.vigencia,
    };
    this.sctrService.aprobar(this.selectedPoliza.id, dto).subscribe({
      next: () => {
        this.savingAprobar = false;
        Swal.fire({ icon: 'success', title: 'Trabajadores aprobados', timer: 1500, showConfirmButton: false });
        this.loadTrabajadores();
      },
      error: (err: HttpErrorResponse) => {
        this.savingAprobar = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  rechazarSeleccionados(): void {
    if (!this.canRechazar || !this.selectedPoliza) return;
    this.savingAprobar = true;
    const dto: SctrVidaLeyAprobarDto = {
      workerIdsAprobados: [],
      workerIdsRechazados: Array.from(this.polizaWorkersSeleccionados),
      obsAbril: this.motivoRechazo || undefined,
    };
    this.sctrService.aprobar(this.selectedPoliza.id, dto).subscribe({
      next: () => {
        this.savingAprobar = false;
        Swal.fire({ icon: 'success', title: 'Trabajadores rechazados', timer: 1500, showConfirmButton: false });
        this.loadTrabajadores();
      },
      error: (err: HttpErrorResponse) => {
        this.savingAprobar = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  verVersiones(): void {
    this.modalVersionesOpen = true;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  verVersionesPoliza(): void {
    this.modalVersionesPolizaOpen = true;
  }

  closeVersionesPoliza(): void {
    this.modalVersionesPolizaOpen = false;
  }

  rechazarSinPoliza(): void {
    const w = this.selectedWorker;
    if (!w?.sctrHabId || this.savingAprobar) return;
    this.savingAprobar = true;
    const dto: WorkerEntregableUpdateDto = {
      estado: 'Rechazado',
      obsAbril: this.motivoRechazo || undefined,
    };
    this.trabajadorHabService.updateEntregable(w.sctrHabId, dto).subscribe({
      next: () => {
        this.savingAprobar = false;
        Swal.fire({ icon: 'success', title: 'Trabajador rechazado', timer: 1500, showConfirmButton: false });
        this.loadTrabajadores();
      },
      error: (err: HttpErrorResponse) => {
        this.savingAprobar = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Shared ───────────────────────────────────────────────

  isContratista(): boolean {
    return this.authService.hasRole('CONTRATISTA');
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP')
    );
  }

  getMesLabel(num: number): string {
    return this.meses.find((m) => m.num === num)?.label ?? String(num);
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Parcial':
        return 'chip-orange';
      case 'Rechazado':
        return 'chip-red';
      case 'Enviado':
        return 'chip-orange';
      case 'Vencido':
        return 'chip-red';
      case 'Falta':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  getViewUrl(url: string): string {
    return `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
  }
}
