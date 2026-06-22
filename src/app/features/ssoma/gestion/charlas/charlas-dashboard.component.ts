import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { CharlasService } from './services/charlas.service';
import { ProjectService } from '../../../../core/services/project.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  DashSupervisoresRow, Capacitacion, NuevaCharlaCreateDto,
  CharlaListItem, CharlaDetalle, UsuarioDto, Staff,
} from './dtos/charlas.dtos';

Chart.register(...registerables);

@Component({
  selector: 'app-charlas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
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
  readonly anioActual = new Date().getFullYear();
  readonly meses = [
    { val: 1, label: 'Enero' }, { val: 2, label: 'Febrero' }, { val: 3, label: 'Marzo' },
    { val: 4, label: 'Abril' }, { val: 5, label: 'Mayo' }, { val: 6, label: 'Junio' },
    { val: 7, label: 'Julio' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Septiembre' },
    { val: 10, label: 'Octubre' }, { val: 11, label: 'Noviembre' }, { val: 12, label: 'Diciembre' },
  ];
  readonly anios = Array.from({ length: 4 }, (_, i) => this.anioActual - 1 + i);

  // ── Tab 1: Dashboard supervisores ─────────────────────────────────────────────
  tab1Rows: DashSupervisoresRow[] = [];
  loadingTab1 = false;

  // ── Tab 2: Capacitaciones ─────────────────────────────────────────────────────
  capacitaciones: Capacitacion[] = [];
  loadingTab2 = false;
  subirFecha = new Date().toISOString().split('T')[0];
  subirTema = '';
  subirFile: File | null = null;
  subirLoading = false;

  // ── Tab 3: Nueva charla ───────────────────────────────────────────────────────
  staff: Staff[] = [];
  supervisores: UsuarioDto[] = [];
  form = {
    titulo: '', tema: '', descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    duracionHoras: 1,
    supervisorId: null as number | null,
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

  private chartInstance: Chart | null = null;

  constructor(
    private svc: CharlasService,
    private projectService: ProjectService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activeTab = this.route.snapshot.data['tab'] ?? 1;

    forkJoin({
      miProyecto: this.svc.getMiProyecto(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      supervisores: this.svc.getSupervisores(),
    }).subscribe({
      next: ({ miProyecto, proyectos, supervisores }) => {
        this.proyectos = proyectos.data.map((p: any) => ({
          id: p.projectId,
          nombre: p.projectDescription ?? p.name ?? '',
        }));
        if (miProyecto) this.proyectoId = miProyecto.proyectoId;
        this.supervisores = supervisores;
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
    if (n === 2 && !this.capacitaciones.length) this.loadTab2();
    if (n === 3 && this.proyectoId && !this.staff.length) this.loadStaff();
    if (n === 4 && !this.tab4Items.length) this.loadTab4();
  }

  onProyectoChange(): void {
    if (!this.proyectoId) return;
    this.loadAll();
    if (this.activeTab === 3) this.loadStaff();
  }

  loadAll(): void {
    this.loadTab1();
    this.loadTab2();
    this.loadTab4();
  }

  // ── Tab 1 ──────────────────────────────────────────────────────────────────────
  loadTab1(): void {
    if (!this.proyectoId) return;
    this.loadingTab1 = true;
    this.svc.getDashboardSupervisores(this.proyectoId, this.mes, this.anio).subscribe({
      next: (rows) => { this.tab1Rows = rows; this.loadingTab1 = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingTab1 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  getPct(r: DashSupervisoresRow): number {
    return r.totalAsistentes > 0 ? Math.round(r.totalAsistio / r.totalAsistentes * 100) : 0;
  }

  pctClass(r: DashSupervisoresRow): string {
    const p = this.getPct(r);
    if (p >= 80) return 'pct-alto';
    if (p >= 50) return 'pct-medio';
    return 'pct-bajo';
  }

  // ── Tab 2 ──────────────────────────────────────────────────────────────────────
  loadTab2(): void {
    if (!this.proyectoId) return;
    this.loadingTab2 = true;
    this.svc.getCapacitaciones(this.proyectoId, this.mes, this.anio).subscribe({
      next: (data) => { this.capacitaciones = data; this.loadingTab2 = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingTab2 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  onSubirFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.subirFile = input.files[0];
  }

  subirEvidencia(): void {
    if (!this.subirFecha || !this.subirTema || !this.subirFile) {
      Swal.fire({ icon: 'warning', title: 'Completa todos los campos', timer: 2000, showConfirmButton: false });
      return;
    }
    this.subirLoading = true;
    this.svc.subirCapacitacion(this.subirFecha, this.subirTema, this.subirFile).subscribe({
      next: () => {
        this.subirLoading = false;
        this.subirTema = ''; this.subirFile = null;
        this.loadTab2();
        Swal.fire({ icon: 'success', title: 'Evidencia subida', timer: 1500, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.subirLoading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  capEstadoClass(e: string): string {
    const map: Record<string, string> = { Falta: 'badge--naranja', Enviado: 'badge--azul', Aprobado: 'badge--verde', Rechazado: 'badge--rojo' };
    return map[e] ?? 'badge--gris';
  }

  // ── Tab 3 ──────────────────────────────────────────────────────────────────────
  private loadStaff(): void {
    if (!this.proyectoId) return;
    this.svc.getStaff(this.proyectoId).subscribe({
      next: (s) => { this.staff = s; this.staffChecks = {}; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  toggleStaff(workerId: number): void {
    this.staffChecks[workerId] = !this.staffChecks[workerId];
    this.form.workerIds = Object.entries(this.staffChecks).filter(([, v]) => v).map(([k]) => Number(k));
  }

  submitCrear(): void {
    if (!this.proyectoId || !this.form.titulo || !this.form.fecha) return;
    const dto: NuevaCharlaCreateDto = {
      proyectoId: this.proyectoId,
      titulo: this.form.titulo,
      tema: this.form.tema || undefined,
      descripcion: this.form.descripcion || undefined,
      fecha: this.form.fecha,
      duracionHoras: this.form.duracionHoras,
      supervisorId: this.form.supervisorId ?? undefined,
      workerIds: this.form.workerIds,
    };
    this.savingForm = true;
    this.svc.crearNuevaCharla(dto).subscribe({
      next: () => {
        this.savingForm = false;
        this.resetForm();
        this.loadTab4();
        Swal.fire({ icon: 'success', title: 'Charla creada', timer: 2000, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.savingForm = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  resetForm(): void {
    this.form = { titulo: '', tema: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], duracionHoras: 1, supervisorId: null, workerIds: [] };
    this.staffChecks = {};
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

  mesLabel(): string { return this.meses.find(m => m.val === this.mes)?.label ?? ''; }
}
