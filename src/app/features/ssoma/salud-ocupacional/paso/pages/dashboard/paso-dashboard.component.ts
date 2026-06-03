import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
})
export class PasoDashboardComponent implements OnInit {
  data: PasoDashboardDto | null = null;
  loading = false;

  constructor(
    private pasoService: PasoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.pasoService.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
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

  get alertasVencidas(): number {
    return this.data?.alertas.filter(a => a.tipo === 'Vencida').length ?? 0;
  }

  get alertasProximas(): number {
    return this.data?.alertas.filter(a => a.tipo === 'ProximaVencer').length ?? 0;
  }

  get alertasRecientes() {
    return this.data?.alertas.slice(0, 5) ?? [];
  }

  estadoBadge(spi: number): string {
    if (spi >= 0.95) return 'bg-green-100 text-green-700';
    if (spi >= 0.80) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  estadoLabel(spi: number): string {
    if (spi >= 0.95) return 'En plazo';
    if (spi >= 0.80) return 'En riesgo';
    return 'Crítico';
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/paso/lista']);
  }

  irAAlertas(): void {
    this.router.navigate(['/ssoma/gestion/paso/alertas']);
  }
}
