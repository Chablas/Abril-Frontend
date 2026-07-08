import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { CharlasService } from '../../services/charlas.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import {
  DashSupervisoresRow, ComparativoMes, Staff, NuevaCharlaCreateDto,
  CharlaListItem, CharlaDetalle, UsuarioDto,
} from '../../dtos/charlas.dtos';

Chart.register(...registerables);

@Component({
  selector: 'app-charlas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './charlas-dashboard.html',
  styleUrl: './charlas-dashboard.css',
})
export class CharlasDashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  loading = true;
  loadingTab1 = false;
  loadingComparativo = false;
  loadingTab4 = false;
  showCrearModal = false;

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

  tab1Rows: DashSupervisoresRow[] = [];
  comparativo: ComparativoMes[] = [];
  private chartInstance: Chart | null = null;

  tab4Items: CharlaListItem[] = [];
  tab4Total = 0;
  tab4Page = 1;
  readonly tab4PageSize = 20;
  tab4Estado = '';
  charlaDetalle: CharlaDetalle | null = null;
  loadingDetalle = false;
  motivoRechazo = '';
  showRechazarForm = false;

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

  constructor(
    private svc: CharlasService,
    private projectService: ProjectService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
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
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.comparativo.length > 0) this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  load(): void {
    if (!this.proyectoId) return;
    this.loadTab1();
    this.loadComparativo();
    this.loadTab4();
  }

  onProyectoChange(): void {
    this.tab4Page = 1;
    this.staff = [];
    this.load();
  }

  loadTab1(): void {
    if (!this.proyectoId) return;
    this.loadingTab1 = true;
    this.svc.getDashboardSupervisores(this.proyectoId, this.mes, this.anio).subscribe({
      next: (rows) => { this.tab1Rows = rows; this.loadingTab1 = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingTab1 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  loadComparativo(): void {
    if (!this.proyectoId) return;
    this.loadingComparativo = true;
    this.chartInstance?.destroy();
    this.chartInstance = null;
    this.svc.getComparativo(this.proyectoId, this.anio).subscribe({
      next: (data) => {
        this.comparativo = data;
        this.loadingComparativo = false;
        this.cdr.markForCheck();
        setTimeout(() => this.renderChart(), 50);
      },
      error: (err: HttpErrorResponse) => { this.loadingComparativo = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  private renderChart(): void {
    if (!this.chartCanvas) return;
    this.chartInstance?.destroy();
    this.chartInstance = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.comparativo.map(m => m.mesNombre),
        datasets: [
          { label: 'Programadas', data: this.comparativo.map(m => m.programadas), backgroundColor: 'rgba(37,99,235,0.7)', borderColor: '#2563eb', borderWidth: 1, borderRadius: 4 },
          { label: 'Realizadas (Aprobado)', data: this.comparativo.map(m => m.realizadas), backgroundColor: 'rgba(22,163,74,0.7)', borderColor: '#16a34a', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

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

  abrirCrear(): void {
    this.showCrearModal = true;
    if (this.proyectoId && !this.staff.length) this.loadStaff();
    this.cdr.markForCheck();
  }

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
        this.showCrearModal = false;
        this.resetForm();
        this.load();
        Swal.fire({ icon: 'success', title: 'Charla creada', timer: 2000, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.savingForm = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  resetForm(): void {
    this.form = {
      titulo: '', tema: '', descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      duracionHoras: 1, supervisorId: null, workerIds: [],
    };
    this.staffChecks = {};
  }

  get charlasEsteMes(): number {
    return this.comparativo.find(m => m.mes === this.mes)?.programadas ?? 0;
  }
  get tasaAsistencia(): number {
    const rows = this.tab1Rows.filter(r => r.totalAsistentes > 0);
    if (!rows.length) return 0;
    return Math.round(rows.reduce((acc, r) => acc + (r.totalAsistio / r.totalAsistentes * 100), 0) / rows.length);
  }
  get charlasAprobadas(): number { return this.tab4Items.filter(i => i.estado === 'Aprobado').length; }
  get charlasPorAprobar(): number { return this.tab4Items.filter(i => i.estado === 'Enviado').length; }

  scoreClass(val: number | null): string {
    if (val == null || val === 0) return 'score-na';
    if (val >= 80) return 'score-verde';
    if (val >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'Aprobado':  return 'badge--verde';
      case 'Rechazado': return 'badge--rojo';
      case 'Enviado':   return 'badge--azul';
      case 'Abierto':   return 'badge--naranja';
      default:          return 'badge--gris';
    }
  }

  mesLabel(): string { return this.meses.find(m => m.val === this.mes)?.label ?? ''; }

  isPdf(url: string | null | undefined): boolean { return !!url && url.toLowerCase().includes('.pdf'); }

  safeUrl(url: string): SafeResourceUrl { return this.sanitizer.bypassSecurityTrustResourceUrl(url); }
}
