import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { CharlasService } from './services/charlas.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FindDiaPipe } from './pipes/find-dia.pipe';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { AppGenericSelectComponent } from '../../../../shared/components/app-generic-select/app-generic-select.component';
import { AppGenericSearchComponent } from '../../../../shared/components/app-generic-search/app-generic-search.component';
import { SharedFiltersService } from '../../../../shared/services/shared-filters.service';
import {
  DashSupervisoresRow, Capacitacion, NuevaCharlaCreateDto,
  CharlaListItem, CharlaDetalle, UsuarioDto, Staff, CharlaGaleriaItem,
  DashPersonalResult, DashPersonalItem, DashDiaSemana,
} from './dtos/charlas.dtos';

Chart.register(...registerables);

@Component({
  selector: 'app-charlas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, AppGenericSelectComponent, AppGenericSearchComponent, FindDiaPipe],
  templateUrl: './charlas-dashboard.component.html',
  styleUrl: './charlas-dashboard.component.css',
})
export class CharlasDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  activeTab = 1;
  loading = true;

  proyectos: { id: number; nombre: string }[] = [];
  proyectoId: number | undefined;
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  mesesData: any[] = [];
  aniosData: any[] = [];

  // ── Tab 1: Dashboard ──────────────────────────────────────────────────────────
  tab1Rows: DashSupervisoresRow[] = [];
  loadingTab1 = false;

  // Dashboard
  dashPersonalResult: DashPersonalResult = { dias: [], staff: [] };
  loadingDash = false;

  // Editar asistencia (Tab 3)
  editCharlaId: number | null = null;
  editCharlaTitle = '';
  editStaffChecks: Record<number, boolean> = {};
  savingEdit = false;

  // ── Tab 2: Capacitaciones ─────────────────────────────────────────────────────
  capacitaciones: Capacitacion[] = [];
  loadingTab2 = false;
  // modal nueva capacitacion
  showNuevaCapModal = false;
  subirFecha = new Date().toISOString().split('T')[0];
  subirTema = '';
  subirFiles: File[] = [];
  subirLoading = false;
  dragOver = false;
  // filtros tab 2
  tab2Estado = '';
  tab2Busqueda = '';
  // inline viewer
  viewerCapId: number | null = null;
  viewerArchivoIdx: Record<number, number> = {};

  // ── Tab 3: Nueva charla ───────────────────────────────────────────────────────
  staff: Staff[] = [];
  supervisores: UsuarioDto[] = [];
  charlaGaleria: CharlaGaleriaItem[] = [];
  loadingTab3 = false;
  showNuevaCharlaModal = false;
  form = {
    titulo: '',
    tipo: 'Seguridad' as 'Seguridad' | 'Salud Ocupacional' | 'Medio Ambiente',
    fecha: new Date().toISOString().split('T')[0],
    workerIds: [] as number[],
  };
  staffChecks: Record<number, boolean> = {};
  savingForm = false;

  // ── Tab 4: Lista y aprobación ─────────────────────────────────────────────────
  tab4Items: CharlaListItem[] = [];
  tab4Total = 0;
  tab4Page = 1;
  readonly tab4PageSize = 20;
  tab4Estado = '';
  loadingTab4 = false;
  charlaDetalle: CharlaDetalle | null = null;
  loadingDetalle = false;
  motivoRechazo = '';
  showRechazarForm = false;

  readonly Math = Math;
  private chartInstance: Chart | null = null;

  constructor(
    private svc: CharlasService,
    private filters: SharedFiltersService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activeTab = this.route.snapshot.data['tab'] ?? 1;

    forkJoin({
      miProyecto: this.svc.getMiProyecto().pipe(catchError(() => of(null))),
      proyectos: this.filters.getProyectos().pipe(catchError(() => of([]))),
      supervisores: this.svc.getSupervisores().pipe(catchError(() => of([]))),
      meses: this.filters.getMeses().pipe(catchError(() => of([]))),
      anios: this.filters.getAnios().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ miProyecto, proyectos, supervisores, meses, anios }) => {
        this.proyectos = proyectos as any[];
        this.mesesData = meses as any[];
        this.aniosData = anios as any[];
        if (miProyecto) this.proyectoId = (miProyecto as any).proyectoId;
        this.supervisores = supervisores as any[];
        this.loading = false;
        this.cdr.markForCheck();
        if (this.proyectoId) this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  setTab(n: number): void {
    this.activeTab = n;
    this.cdr.markForCheck();
    if (n === 1 && !this.tab1Rows.length) this.loadTab1();
    if (n === 2) this.loadTab2();
    if (n === 3 && this.proyectoId) this.loadTab3();
    if (n === 4 && !this.tab4Items.length) this.loadTab4();
  }

  onProyectoChange(): void {
    if (!this.proyectoId) return;
    this.loadAll();
    if (this.activeTab === 3) this.loadTab3();
  }

  loadAll(): void {
    this.loadTab1();
    this.loadTab4();
    if (this.activeTab === 2) this.loadTab2();
  }

  // ── Tab 1 ──────────────────────────────────────────────────────────────────────
  loadTab1(): void {
    this.loadDash();
  }

  loadDash(): void {
    if (!this.proyectoId) return;
    this.loadingDash = true;
    this.cdr.markForCheck();
    this.svc.getDashPersonal(this.proyectoId, this.mes, this.anio).subscribe({
      next: (d) => { this.dashPersonalResult = d; this.loadingDash = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingDash = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  abrirEditAsistencia(charla: CharlaGaleriaItem): void {
    this.editCharlaId = charla.id;
    this.editCharlaTitle = charla.titulo;
    this.editStaffChecks = {};
    this.savingEdit = false;
    // Pre-cargar asistencia actual
    this.svc.getAsistencia(charla.id).subscribe({
      next: (list) => {
        list.forEach(a => { if (a.asistio) this.editStaffChecks[a.workerId] = true; });
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  cerrarEditAsistencia(): void {
    this.editCharlaId = null;
    this.cdr.markForCheck();
  }

  toggleEditStaff(workerId: number): void {
    this.editStaffChecks[workerId] = !this.editStaffChecks[workerId];
    this.cdr.markForCheck();
  }

  countEditChecked(): number {
    return Object.values(this.editStaffChecks).filter(Boolean).length;
  }

  seleccionarTodosEdit(): void {
    const allChecked = this.staff.every(s => this.editStaffChecks[s.workerId]);
    this.staff.forEach(s => { this.editStaffChecks[s.workerId] = !allChecked; });
    this.cdr.markForCheck();
  }

  guardarEditAsistencia(): void {
    if (!this.editCharlaId) return;
    const workerIds = Object.entries(this.editStaffChecks).filter(([, v]) => v).map(([k]) => Number(k));
    this.savingEdit = true;
    this.cdr.markForCheck();
    this.svc.editarAsistencia(this.editCharlaId, workerIds).subscribe({
      next: () => {
        this.savingEdit = false;
        this.cerrarEditAsistencia();
        this.loadTab3();
        Swal.fire({ icon: 'success', title: 'Asistencia actualizada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.savingEdit = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  pctClass(pct: number): string {
    if (pct >= 80) return 'pct-alto';
    if (pct >= 50) return 'pct-medio';
    return 'pct-bajo';
  }

  getPct(r: DashSupervisoresRow): number {
    return r.totalAsistentes > 0 ? Math.round(r.totalAsistio / r.totalAsistentes * 100) : 0;
  }

  // ── Tab 2 ──────────────────────────────────────────────────────────────────────
  loadTab2(): void {
    if (!this.proyectoId) return;
    this.loadingTab2 = true;
    this.svc.getCapacitaciones(this.proyectoId, this.mes || undefined, this.anio || undefined).subscribe({
      next: (data) => {
        this.capacitaciones = data.filter(c => c.estado !== 'Falta');
        this.loadingTab2 = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.loadingTab2 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get capacitacionesFiltradas() {
    return this.capacitaciones.filter(c => {
      const porEstado = !this.tab2Estado || c.estado === this.tab2Estado;
      const porNombre = !this.tab2Busqueda || c.nombreCompleto.toLowerCase().includes(this.tab2Busqueda.toLowerCase());
      return porEstado && porNombre;
    });
  }

  abrirNuevaCapModal(): void {
    this.subirFecha = new Date().toISOString().split('T')[0];
    this.subirTema = '';
    this.subirFiles = [];
    this.dragOver = false;
    this.showNuevaCapModal = true;
    this.cdr.markForCheck();
  }

  cerrarNuevaCapModal(): void {
    this.showNuevaCapModal = false;
    this.cdr.markForCheck();
  }

  toggleViewer(id: number | null): void {
    this.viewerCapId = this.viewerCapId === id ? null : id;
    this.cdr.markForCheck();
  }

  onSubirFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(): void {
    this.dragOver = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files.length) this.addFiles(Array.from(event.dataTransfer.files));
    this.cdr.markForCheck();
  }

  addFiles(files: File[]): void {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    files.forEach(f => {
      if (allowed.includes(f.type) && !this.subirFiles.find(x => x.name === f.name && x.size === f.size))
        this.subirFiles.push(f);
    });
    this.cdr.markForCheck();
  }

  removeFile(i: number): void {
    this.subirFiles.splice(i, 1);
    this.cdr.markForCheck();
  }

  subirEvidencia(): void {
    if (!this.subirFecha || !this.subirTema || !this.subirFiles.length) {
      Swal.fire({ icon: 'warning', title: 'Completa todos los campos', timer: 2000, showConfirmButton: false });
      return;
    }
    this.subirLoading = true;
    this.cdr.markForCheck();
    this.svc.subirCapacitacionMulti(this.subirFecha, this.subirTema, this.subirFiles).subscribe({
      next: () => {
        this.subirLoading = false;
        this.showNuevaCapModal = false;
        this.subirTema = ''; this.subirFiles = [];
        this.loadTab2();
        Swal.fire({ icon: 'success', title: 'Capacitación registrada', timer: 1500, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.subirLoading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  getArchivoIdx(capId: number): number {
    return this.viewerArchivoIdx[capId] ?? 0;
  }

  setArchivoIdx(capId: number, idx: number): void {
    this.viewerArchivoIdx[capId] = idx;
    this.cdr.markForCheck();
  }

  capEstadoClass(e: string): string {
    const map: Record<string, string> = { Falta: 'badge--naranja', Enviado: 'badge--azul', Aprobado: 'badge--verde', Rechazado: 'badge--rojo' };
    return map[e] ?? 'badge--gris';
  }

  // ── Tab 3 ──────────────────────────────────────────────────────────────────────
  loadTab3(): void {
    if (!this.proyectoId) return;
    this.loadingTab3 = true;
    forkJoin({
      galeria: this.svc.getCharlasProyecto(this.proyectoId, this.mes, this.anio).pipe(catchError(() => of([]))),
      staff: this.svc.getStaff(this.proyectoId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ galeria, staff }) => {
        this.charlaGaleria = galeria as CharlaGaleriaItem[];
        this.staff = staff as Staff[];
        this.loadingTab3 = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingTab3 = false; this.cdr.markForCheck(); },
    });
  }

  abrirNuevaCharlaModal(): void {
    this.form = { titulo: '', tipo: 'Seguridad', fecha: new Date().toISOString().split('T')[0], workerIds: [] };
    this.staffChecks = {};
    this.showNuevaCharlaModal = true;
    this.cdr.markForCheck();
  }

  cerrarNuevaCharlaModal(): void {
    this.showNuevaCharlaModal = false;
    this.cdr.markForCheck();
  }

  toggleStaff(workerId: number): void {
    this.staffChecks[workerId] = !this.staffChecks[workerId];
    this.form.workerIds = Object.entries(this.staffChecks).filter(([, v]) => v).map(([k]) => Number(k));
  }

  seleccionarTodosNueva(): void {
    const allChecked = this.staff.every(s => this.staffChecks[s.workerId]);
    this.staff.forEach(s => { this.staffChecks[s.workerId] = !allChecked; });
    this.form.workerIds = allChecked ? [] : this.staff.map(s => s.workerId);
  }

  submitCrear(): void {
    if (!this.proyectoId || !this.form.titulo || !this.form.fecha) return;
    const dto: NuevaCharlaCreateDto = {
      proyectoId: this.proyectoId,
      titulo: this.form.titulo,
      tema: this.form.tipo,
      fecha: this.form.fecha,
      duracionHoras: 1,
      workerIds: this.form.workerIds,
    };
    this.savingForm = true;
    this.svc.crearNuevaCharla(dto).subscribe({
      next: () => {
        this.savingForm = false;
        this.showNuevaCharlaModal = false;
        this.loadTab3();
        Swal.fire({ icon: 'success', title: 'Charla registrada', timer: 1800, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.savingForm = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  tipoClass(tipo: string): string {
    if (tipo === 'Salud Ocupacional') return 'tipo--salud';
    if (tipo === 'Medio Ambiente') return 'tipo--ambiente';
    return 'tipo--seguridad';
  }

  // ── Tab 4 ──────────────────────────────────────────────────────────────────────
  loadTab4(): void {
    this.loadingTab4 = true;
    this.svc.getLista(this.proyectoId, this.tab4Estado || undefined, this.tab4Page, this.tab4PageSize).subscribe({
      next: (r) => { this.tab4Items = r.items; this.tab4Total = r.total; this.loadingTab4 = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingTab4 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get tab4TotalPages(): number { return Math.ceil(this.tab4Total / this.tab4PageSize); }

  get miProyectoNombre(): string {
    return this.proyectos.find(p => p.id === this.proyectoId)?.nombre ?? 'Mi proyecto';
  }

  tab4GoPage(p: number): void {
    if (p < 1 || p > this.tab4TotalPages) return;
    this.tab4Page = p;
    this.loadTab4();
  }

  abrirDetalle(item: CharlaListItem): void {
    this.charlaDetalle = null;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.loadingDetalle = true;
    this.cdr.markForCheck();
    this.svc.getDetalle(item.id).subscribe({
      next: (d) => { this.charlaDetalle = d; this.loadingDetalle = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingDetalle = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  cerrarDetalle(): void {
    this.charlaDetalle = null;
    this.loadingDetalle = false;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.cdr.markForCheck();
  }

  aprobar(): void {
    if (!this.charlaDetalle) return;
    this.loader.show();
    this.svc.aprobar(this.charlaDetalle.id).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.loadTab4();
        Swal.fire({ icon: 'success', title: 'Aprobado', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  rechazar(): void {
    if (!this.charlaDetalle || !this.motivoRechazo.trim()) return;
    this.loader.show();
    this.svc.rechazar(this.charlaDetalle.id, this.motivoRechazo.trim()).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.loadTab4();
        Swal.fire({ icon: 'info', title: 'Rechazado', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────
  estadoClass(estado: string): string {
    const map: Record<string, string> = { Aprobado: 'badge--verde', Rechazado: 'badge--rojo', Enviado: 'badge--azul', Abierto: 'badge--naranja' };
    return map[estado] ?? 'badge--gris';
  }

  formatFecha(f: string | null | undefined): string {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isPdf(url: string | null | undefined): boolean { return !!url && url.toLowerCase().includes('.pdf'); }

  safeUrl(url: string): SafeResourceUrl { return this.sanitizer.bypassSecurityTrustResourceUrl(url); }

  mesLabel(): string { return this.mesesData.find(m => m.id == this.mes)?.nombre ?? ''; }
}
