import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AmonestacionService } from '../../services/amonestacion.service';
import {
  AmonestacionDashboardDto,
  AmonestacionListItemDto,
  AmonestacionListQuery,
  WorkerPuntajeDto,
} from '../../dtos/amonestacion.dtos';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

type Tab = 'dashboard' | 'lista' | 'puntaje';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-amonestaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './amonestaciones.html',
  styleUrl: './amonestaciones.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Amonestaciones implements OnInit {
  tab: Tab = 'dashboard';

  // ── Dashboard ─────────────────────────────────────────────────────
  dashboard: AmonestacionDashboardDto | null = null;
  loadingDashboard = false;

  // ── Lista ─────────────────────────────────────────────────────────
  lista: AmonestacionListItemDto[] = [];
  loadingLista = false;
  totalLista = 0;
  query: AmonestacionListQuery = { page: 1, pageSize: 20 };
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  // ── Puntaje ───────────────────────────────────────────────────────
  puntajeQuery = '';
  puntajeResults: WorkerSearchItemDto[] = [];
  puntajeSearching = false;
  puntajeDto: WorkerPuntajeDto | null = null;
  loadingPuntaje = false;

  private puntajeQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  readonly MESES = MESES;

  constructor(
    private svc: AmonestacionService,
    private workerSearch: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.puntajeQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runPuntajeSearch(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Dashboard',          icono: 'ti-chart-bar',   active: this.tab === 'dashboard' },
      { label: 'Ver amonestaciones',  icono: 'ti-list',        active: this.tab === 'lista' },
      { label: 'Puntaje trabajador',  icono: 'ti-user-check',  active: this.tab === 'puntaje' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    const map: Record<string, Tab> = {
      'Dashboard': 'dashboard',
      'Ver amonestaciones': 'lista',
      'Puntaje trabajador': 'puntaje',
    };
    const key = map[t.label];
    if (key) this.setTab(key);
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'dashboard' && !this.dashboard) this.loadDashboard();
    if (t === 'lista' && this.lista.length === 0) this.loadLista();
    this.cdr.markForCheck();
  }

  // ── Dashboard ─────────────────────────────────────────────────────

  loadDashboard(): void {
    this.loadingDashboard = true;
    this.svc.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.loadingDashboard = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDashboard = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get tendenciaTexto(): string {
    if (!this.dashboard?.tendencia?.length) return '';
    const last = this.dashboard.tendencia[this.dashboard.tendencia.length - 1];
    return `${MESES[last.mes]} ${last.anio}: ${last.total}`;
  }

  // ── Lista ─────────────────────────────────────────────────────────

  loadLista(): void {
    this.loadingLista = true;
    const q: AmonestacionListQuery = {
      ...this.query,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
    };
    this.svc.getLista(q).subscribe({
      next: (res) => {
        this.lista = res.items;
        this.totalLista = res.total;
        this.loadingLista = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingLista = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  filtrar(): void {
    this.query.page = 1;
    this.loadLista();
  }

  cambiarPagina(p: number): void {
    this.query.page = p;
    this.loadLista();
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalLista / (this.query.pageSize ?? 20));
  }

  verDetalle(id: number): void {
    Swal.fire({
      title: 'Ver detalles',
      html: `Amonestación #${id}`,
      showCancelButton: true,
      confirmButtonText: 'Ver PDF',
      cancelButtonText: 'Cerrar',
      icon: 'info',
    }).then((r) => {
      if (r.isConfirmed) {
        window.open(this.svc.getPdfUrl(id), '_blank');
      }
    });
  }

  nivelColor(nivel: string): string {
    switch (nivel) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      default:        return 'badge-bajo';
    }
  }

  // ── Puntaje ───────────────────────────────────────────────────────

  onPuntajeQueryChange(value: string): void {
    this.puntajeQuery = value;
    this.puntajeDto = null;
    if (!value || value.trim().length < 2) {
      this.puntajeResults = [];
      return;
    }
    this.puntajeSearching = true;
    this.puntajeQuery$.next(value.trim());
  }

  private runPuntajeSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => {
        this.puntajeResults = res;
        this.puntajeSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.puntajeResults = [];
        this.puntajeSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectPuntajeWorker(w: WorkerSearchItemDto): void {
    this.puntajeQuery = w.apellidoNombre;
    this.puntajeResults = [];
    this.loadingPuntaje = true;
    this.loaderService.show();
    this.svc.getPuntajeWorker(w.id).subscribe({
      next: (dto) => {
        this.puntajeDto = dto;
        this.loadingPuntaje = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPuntaje = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get puntajeBarWidth(): string {
    if (!this.puntajeDto) return '0%';
    return `${Math.min(100, (this.puntajeDto.puntosAcumulados / 10) * 100)}%`;
  }

  get puntajeBarColor(): string {
    if (!this.puntajeDto) return '#10b981';
    const p = this.puntajeDto.puntosAcumulados;
    if (p >= 10) return '#dc2626';
    if (p >= 7)  return '#f59e0b';
    if (p >= 4)  return '#f97316';
    return '#10b981';
  }

  get maxTendencia(): number {
    if (!this.dashboard?.tendencia?.length) return 1;
    return Math.max(...this.dashboard.tendencia.map((t) => t.total), 1);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const current = this.query.page ?? 1;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  // ── Navegación ────────────────────────────────────────────────────

  nuevaAmonestacion(): void {
    this.router.navigate(['/ssoma/gestion/amonestaciones/nueva']);
  }
}
