import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PasoService } from '../../services/paso.service';
import { PasoDashboardDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-paso-dashboard',
  standalone: true,
  imports: [CommonModule, SpiBadgeComponent],
  templateUrl: './paso-dashboard.component.html',
  styleUrl: './paso-dashboard.component.css',
})
export class PasoDashboardComponent implements OnInit, OnDestroy {
  data: PasoDashboardDto | null = null;
  loading = false;

  // Count-up display values
  dispSpi    = 0;
  dispAvance = 0;
  dispVencidas = 0;
  dispProximas = 0;

  private timers: ReturnType<typeof setInterval>[] = [];
  readonly anioActual = new Date().getFullYear();

  constructor(
    private pasoService: PasoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.timers.forEach(t => clearInterval(t)); }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.pasoService.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.runCountUp();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private runCountUp(): void {
    if (!this.data) return;
    this.animate('dispSpi',      0, Math.round((this.data.consolidado.spi ?? 0) * 100), 900);
    this.animate('dispAvance',   0, Math.round(this.data.consolidado.avancePorcentaje ?? 0), 700);
    this.animate('dispVencidas', 0, this.data.consolidado.vencidas ?? 0, 600);
    this.animate('dispProximas', 0, this.alertasProximas, 600);
  }

  private animate(prop: 'dispSpi' | 'dispAvance' | 'dispVencidas' | 'dispProximas', from: number, to: number, ms: number): void {
    if (to === 0) { this[prop] = 0; return; }
    const steps = Math.max(1, Math.round(ms / 16));
    let step = 0;
    const inc = (to - from) / steps;
    const t = setInterval(() => {
      step++;
      this[prop] = step < steps ? Math.round(from + inc * step) : to;
      this.cdr.detectChanges();
      if (step >= steps) clearInterval(t);
    }, 16);
    this.timers.push(t);
  }

  get alertasVencidas(): number {
    return this.data?.alertas.filter(a => a.tipo === 'Vencida').length ?? 0;
  }

  get alertasProximas(): number {
    return this.data?.alertas.filter(a => a.tipo === 'ProximaVencer').length ?? 0;
  }

  get alertasRecientes() {
    return this.data?.alertas.slice(0, 5) ?? [];
  }

  get programasActivos(): number {
    return this.data?.proyectos.length ?? 0;
  }

  spiColor(spi: number): string {
    if (spi >= 0.95) return '#198754';
    if (spi >= 0.80) return '#ffc107';
    return '#dc3545';
  }

  estadoLabel(spi: number): string {
    if (spi >= 0.95) return 'En plazo';
    if (spi >= 0.80) return 'En riesgo';
    return 'Crítico';
  }

  estadoBadgeClass(spi: number): string {
    if (spi >= 0.95) return 'badge-estado--green';
    if (spi >= 0.80) return 'badge-estado--yellow';
    return 'badge-estado--red';
  }

  irALista(): void { this.router.navigate(['/ssoma/gestion/paso/lista']); }
  irAAlertas(): void { this.router.navigate(['/ssoma/gestion/paso/alertas']); }
}
