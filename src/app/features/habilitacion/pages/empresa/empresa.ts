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
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';
import { ProyectosEmpresa } from './components/proyectos-empresa/proyectos-empresa';
import { ArchivoStagingDto, DocumentoVersionDto } from '../../dtos/trabajador.model';
import { Observable, EMPTY } from 'rxjs';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import {
  EmpresaContratistaListDto,
  EmpresaEntregableDto,
  EmpresaEntregableUpdateDto,
  EntregableMesDto,
  ProyectoDisponibleDto,
} from '../../dtos/empresa.model';

interface ProgresoProyecto {
  total: number;
  aprobadosEquiv: number;
  rechazados: number;
  entregables: EmpresaEntregableDto[];
}

@Component({
  selector: 'app-hab-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, DocumentViewer, VersionesDoc, ProyectosEmpresa],
  templateUrl: './empresa.html',
  styleUrl: './empresa.css',
})
export class Empresa implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  empresaId: number | null = null;
  empresas: EmpresaContratistaListDto[] = [];

  proyectosActivos: ProyectoDisponibleDto[] = [];
  loadingProyectos = false;

  selectedProyecto: ProyectoDisponibleDto | null = null;
  entregables: EmpresaEntregableDto[] = [];
  loadingEntregables = false;

  selectedEntregable: EmpresaEntregableDto | null = null;
  drawerOpen = false;

  progresoPorProyecto = new Map<number, ProgresoProyecto>();
  loadingProgreso = new Set<number>();

  archivosPendientes: ArchivoStagingDto[] = [];
  panelVigencia = '';
  panelObsAbril = '';
  panelObsContratista = '';
  panelEstado = '';

  mesSeleccionado: EntregableMesDto | null = null;
  mesPanelMes: number = new Date().getMonth();
  mesPanelAnio: number = new Date().getFullYear();
  readonly mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  get mesesDisponibles(): { mes: number; anio: number; label: string }[] {
    const result: { mes: number; anio: number; label: string }[] = [];
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      result.push({ mes: d.getMonth() + 1, anio: d.getFullYear(),
        label: `${this.mesesNombres[d.getMonth()]} ${d.getFullYear()}` });
    }
    return result;
  }

  get mesActualLabel(): string {
    return `${this.mesesNombres[this.mesPanelMes]} ${this.mesPanelAnio}`;
  }

  get uploadingFile(): boolean { return this.archivosPendientes.some(a => a.subiendo); }
  get panelArchivoUrl(): string { return this.archivosPendientes.find(a => a.path)?.path ?? ''; }

  private readonly SCTR_VIDA_LEY_IDS = [15, 16];
  private readonly VIGENCIA_ANTE_UPLOAD_IDS = [11, 12, 20, 22];

  get esSCTRoVidaLey(): boolean {
    return !!this.selectedEntregable && this.SCTR_VIDA_LEY_IDS.includes(this.selectedEntregable.itemId);
  }

  get requiereVigenciaAnteUpload(): boolean {
    return !!this.selectedEntregable && this.VIGENCIA_ANTE_UPLOAD_IDS.includes(this.selectedEntregable.itemId);
  }

  get uploadBloqueadoPorVigencia(): boolean {
    return this.requiereVigenciaAnteUpload && !this.panelVigencia && !this.esPermanente;
  }

  get esPermanente(): boolean {
    return !!this.selectedEntregable && (this.selectedEntregable.itemId === 12 || this.selectedEntregable.itemId === 13);
  }

  visorArchivoUrl = '';
  visorNombre = '';

  mostrarProyectos = false;

  modalVersionesOpen = false;
  versionesLoader = (id: number): Observable<DocumentoVersionDto[]> =>
    this.empresaId ? this.habEmpresaService.getVersiones(this.empresaId, id) : EMPTY;

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
      const id = this.readEmpresaIdFromJwt();
      if (id) {
        this.empresaId = id;
        this.loadProyectos();
      }
    } else if (this.isAdmin()) {
      this.loadEmpresasAdmin();
    }
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP')
    );
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

  private loadEmpresasAdmin(): void {
    this.empresaContratistaService.getEmpresas({ soloContratistas: false, pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresas = [];
      },
    });
  }

  onEmpresaChange(id: number | null): void {
    this.empresaId = id;
    this.resetAll();
    if (id) this.loadProyectos();
  }

  private resetAll(): void {
    this.proyectosActivos = [];
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.progresoPorProyecto.clear();
    this.loadingProgreso.clear();
    this.cdr.detectChanges();
  }

  loadProyectos(): void {
    if (!this.empresaId) return;
    this.loadingProyectos = true;
    this.proyectosActivos = [];
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.progresoPorProyecto.clear();
    this.habEmpresaService.getProyectosDisponibles(this.empresaId).subscribe({
      next: (res) => {
        this.proyectosActivos = (res ?? []).filter((p) => p.estaActiva);
        this.loadingProyectos = false;
        this.cdr.detectChanges();
        this.loadProgresoBatch(this.proyectosActivos);
      },
      error: (err) => {
        this.loadingProyectos = false;
        this.errorService.handleError(err);
      },
    });
  }

  private loadProgresoBatch(proyectos: ProyectoDisponibleDto[]): void {
    if (!this.empresaId || proyectos.length === 0) return;
    const eid = this.empresaId;
    for (const p of proyectos) {
      this.loadingProgreso.add(p.id);
      this.habEmpresaService.getEntregables(eid, p.id).subscribe({
        next: (items) => {
          const list = items ?? [];
          console.log('proyecto:', p.nombre, 'entregables:', list);
          console.log('total:', list.length, 'aprobados:', list.filter((e) => e.estado === 'Aprobado').length);
          this.progresoPorProyecto.set(p.id, {
            total: list.length,
            aprobadosEquiv: list.filter(
              (e) => e.estado === 'Aprobado' || e.estado === 'No Aplica' || e.estado === 'En Plazo',
            ).length,
            rechazados: list.filter((e) => e.estado === 'Rechazado').length,
            entregables: list,
          });
          this.loadingProgreso.delete(p.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingProgreso.delete(p.id);
          this.cdr.detectChanges();
        },
      });
    }
  }

  getProgreso(proyectoId: number): ProgresoProyecto | null {
    return this.progresoPorProyecto.get(proyectoId) ?? null;
  }

  isLoadingProgreso(proyectoId: number): boolean {
    return this.loadingProgreso.has(proyectoId);
  }

  getCardBorderClass(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return '';
    if (p.rechazados > 0) return 'proj-card--red';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'proj-card--green';
    return 'proj-card--amber';
  }

  getEstadoBadge(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return '';
    if (p.rechazados > 0) return 'Con rechazos';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'Habilitado';
    return 'En proceso';
  }

  getEstadoBadgeClass(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return 'chip-gray';
    if (p.rechazados > 0) return 'chip-red';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'chip-green';
    return 'chip-orange';
  }

  selectProyecto(p: ProyectoDisponibleDto): void {
    this.selectedProyecto = p;
    this.selectedEntregable = null;
    this.drawerOpen = false;
    const cached = this.progresoPorProyecto.get(p.id);
    if (cached) {
      this.entregables = cached.entregables;
      this.loadingEntregables = false;
      this.cdr.detectChanges();
    } else {
      this.loadEntregablesForProyecto(p.id);
    }
  }

  volverAProyectos(): void {
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.cdr.detectChanges();
  }

  private loadEntregablesForProyecto(proyectoId: number): void {
    if (!this.empresaId) return;
    this.loadingEntregables = true;
    this.habEmpresaService.getEntregables(this.empresaId, proyectoId).subscribe({
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

  getEntregablesPorResponsable(responsable: string): EmpresaEntregableDto[] {
    return this.entregables.filter(
      (e) => (e.responsable || '').toUpperCase() === responsable.toUpperCase(),
    );
  }

  selectEntregable(e: EmpresaEntregableDto): void {
    this.selectedEntregable = e;
    this.archivosPendientes = [];
    this.mesSeleccionado = null;

    const hoy = new Date();
    const mesAnterior = hoy.getMonth() === 0 ? 12 : hoy.getMonth();
    const anioAnterior = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
    this.mesPanelMes = mesAnterior - 1;
    this.mesPanelAnio = anioAnterior;

    if (e.esMensual && e.meses?.length > 0) {
      const mesExistente = e.meses.find(m => m.mes === mesAnterior && m.anio === anioAnterior);
      this.mesSeleccionado = mesExistente ?? null;
    }

    this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
    if (!e.vigencia && e.itemId !== 12 && e.itemId !== 13) {
      const mesSig = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 27);
      this.panelVigencia = mesSig.toISOString().substring(0, 10);
    }
    this.panelObsAbril = e.obsAbril ?? '';
    this.panelObsContratista = e.obsContratista ?? '';
    this.panelEstado = e.estado;
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  onMesChange(mes: number, anio: number): void {
    this.mesPanelMes = mes - 1;
    this.mesPanelAnio = anio;
    this.archivosPendientes = [];
    if (this.selectedEntregable?.meses) {
      this.mesSeleccionado = this.selectedEntregable.meses.find(
        m => m.mes === mes && m.anio === anio
      ) ?? null;
    }
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    if (this.isContratista()) {
      this.guardarObservaciones();
    }
    this.drawerOpen = false;
    this.selectedEntregable = null;
    this.panelEstado = '';
  }

  guardarObservaciones(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    const id = this.selectedEntregable.id;
    const obs = this.panelObsContratista;
    this.habEmpresaService
      .updateEntregable(this.empresaId, id, { obsContratista: obs || undefined })
      .subscribe({
        next: () => {
          const e = this.entregables.find(x => x.id === id);
          if (e) e.obsContratista = obs;
        },
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

  abrirDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private extractFileName(url: string): string {
    const parts = url.split(/[\\/]/);
    return parts[parts.length - 1] || url;
  }

  nombreArchivo(url: string): string {
    return this.extractFileName(url).replace(/^\d{8}_/, '');
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    return 'dot-no-aplica';
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado': return 'chip-green';
      case 'Enviado': return 'chip-orange';
      case 'Rechazado': return 'chip-red';
      case 'No Aplica': return 'chip-gray';
      default: return 'chip-gray';
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) return;
    input.value = '';

    for (const file of files) {
      const item: ArchivoStagingDto = {
        file, nombre: file.name, esZip: file.name.endsWith('.zip'),
        subiendo: false, error: false,
      };
      this.archivosPendientes.push(item);
    }
    this.cdr.detectChanges();
  }

  private autoMarcarEnviado(): void {
    if (!this.selectedEntregable || !this.empresaId) return;

    const payload: EmpresaEntregableUpdateDto = {
      estado: 'Enviado',
      archivoUrl: this.panelArchivoUrl || undefined,
      vigencia: this.panelVigencia || undefined,
      obsContratista: this.isContratista() ? this.panelObsContratista || undefined : undefined,
      obsAbril: !this.isContratista() ? this.panelObsAbril || undefined : undefined,
    };

    this.habEmpresaService
      .updateEntregable(this.empresaId, this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.panelEstado = 'Enviado';
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  clearArchivo(): void {
    this.archivosPendientes = [];
  }

  quitarArchivo(idx: number): void {
    this.archivosPendientes.splice(idx, 1);
    this.cdr.detectChanges();
  }

  abrirVisor(url: string): void {
    this.visorArchivoUrl = url;
    this.visorNombre = this.nombreArchivo(url);
    this.cdr.detectChanges();
  }

  onVisorClosed(): void {
    this.visorArchivoUrl = '';
    this.visorNombre = '';
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    if (this.archivosPendientes.length === 0) {
      Swal.fire({ icon: 'error', title: 'Debes adjuntar al menos un archivo' });
      return;
    }
    if (this.selectedEntregable.requiereVigencia && !this.panelVigencia && !this.esPermanente) {
      Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
      return;
    }

    const contexto = `habilitacion/empresas/${this.empresaId}`;
    const entregableId = this.selectedEntregable.id;

    this.archivosPendientes.forEach(a => a.subiendo = true);
    this.cdr.detectChanges();

    const subir = (idx: number): void => {
      if (idx >= this.archivosPendientes.length) {
        const archivos = this.archivosPendientes.map(a => ({
          archivoUrl: a.path!,
          nombreArchivo: a.nombre,
          esZip: a.esZip,
          zipContenido: a.zipContenido,
        }));
        this.sharepointService.enviarDocumento({
          habEmpresaId: entregableId,
          vigencia: (this.isContratista() && this.selectedEntregable!.requiereVigencia)
            ? (this.panelVigencia || undefined)
            : (!this.isContratista() ? (this.panelVigencia || undefined) : undefined),
          obsContratista: this.isContratista() ? this.panelObsContratista || undefined : undefined,
          ...(this.selectedEntregable!.esMensual ? {
            mes: this.mesPanelMes + 1,
            anio: this.mesPanelAnio,
          } : {}),
          archivos,
        }).subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Enviado', timer: 1500, showConfirmButton: false });
            this.archivosPendientes = [];
            this.closeDrawer();
            this.recargarEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
        return;
      }

      const item = this.archivosPendientes[idx];
      this.sharepointService.subirArchivoMultiple(item.file, contexto).subscribe({
        next: (res) => {
          item.path = res.path;
          item.esZip = res.esZip;
          item.zipContenido = res.zipContenido;
          item.subiendo = false;
          this.cdr.detectChanges();
          subir(idx + 1);
        },
        error: () => {
          item.error = true;
          item.subiendo = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: `Error al subir ${item.nombre}` });
        },
      });
    };

    this.loaderService.show();
    subir(0);
  }

  guardarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;

    let payload: EmpresaEntregableUpdateDto;

    if (this.isContratista()) {
      if (!this.panelArchivoUrl) {
        Swal.fire({ icon: 'error', title: 'Debes subir un archivo antes de guardar' });
        return;
      }
      if (this.selectedEntregable.requiereVigencia && !this.panelVigencia) {
        Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
        return;
      }
      payload = {
        archivoUrl: this.panelArchivoUrl || undefined,
        vigencia: this.panelVigencia || undefined,
        obsContratista: this.panelObsContratista || undefined,
      };
    } else {
      payload = {
        estado: this.panelEstado || this.selectedEntregable.estado,
        vigencia: this.panelVigencia || undefined,
        archivoUrl: this.panelArchivoUrl || undefined,
        obsAbril: this.panelObsAbril || undefined,
      };
    }

    this.loaderService.show();
    this.habEmpresaService
      .updateEntregable(this.empresaId, this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
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
            Swal.fire({ icon: 'success', title: 'Aprobado', timer: 1500, showConfirmButton: false });
            this.closeDrawer();
            this.recargarEntregables();
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
            Swal.fire({ icon: 'success', title: 'Rechazado', timer: 1500, showConfirmButton: false });
            this.closeDrawer();
            this.recargarEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  private recargarEntregables(): void {
    if (!this.selectedProyecto || !this.empresaId) return;
    const pid = this.selectedProyecto.id;
    const eid = this.empresaId;
    this.habEmpresaService.getEntregables(eid, pid).subscribe({
      next: (items) => {
        const list = items ?? [];
        this.entregables = list;
        this.progresoPorProyecto.set(pid, {
          total: list.length,
          aprobadosEquiv: list.filter(
            (e) => e.estado === 'Aprobado' || e.estado === 'No Aplica' || e.estado === 'En Plazo',
          ).length,
          rechazados: list.filter((e) => e.estado === 'Rechazado').length,
          entregables: list,
        });
        if (this.selectedEntregable) {
          const updated = list.find((e) => e.id === this.selectedEntregable!.id);
          if (updated) this.selectedEntregable = updated;
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  abrirProyectos(): void {
    this.mostrarProyectos = true;
  }

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  onProyectosChanged(): void {
    this.loadProyectos();
  }

  aprobarMesEspecifico(mes: EntregableMesDto): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${this.mesesNombres[mes.mes - 1]} ${mes.anio}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService.aprobarMes(this.empresaId, mes.id, {
        estado: 'Aprobado',
        vigencia: this.panelVigencia || undefined,
      }).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Mes aprobado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  rechazarMesEspecifico(mes: EntregableMesDto): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'warning',
      title: `Rechazar ${this.mesesNombres[mes.mes - 1]} ${mes.anio}`,
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (v) => (!v?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService.aprobarMes(this.empresaId, mes.id, {
        estado: 'Rechazado',
        motivoRechazo: res.value,
      }).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Rechazado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  eliminarArchivoVersion(archivoId: number): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar archivo?',
      text: 'Solo puedes eliminar archivos de documentos aún no revisados.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.habEmpresaService.eliminarArchivo(archivoId).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
