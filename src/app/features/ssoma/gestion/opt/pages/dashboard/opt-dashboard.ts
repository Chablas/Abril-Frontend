import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OptService } from '../../services/opt.service';
import { OptDashboardDto } from '../../dtos/opt.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-opt-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './opt-dashboard.html',
  styleUrl: './opt-dashboard.css',
})
export class OptDashboard implements OnInit {
  data: OptDashboardDto | null = null;
  loading = true;
  readonly anioActual = new Date().getFullYear();

  constructor(
    private optService: OptService,
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
    this.optService.getDashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/opt/nuevo']);
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/opt/lista']);
  }

  scoreClass(score?: number): string {
    if (score === undefined || score === null) return 'score--na';
    if (score >= 80) return 'score--verde';
    if (score >= 60) return 'score--amarillo';
    return 'score--rojo';
  }

  maxTendencia(): number {
    if (!this.data?.tendenciaMensual?.length) return 1;
    return Math.max(...this.data.tendenciaMensual.map((t) => t.totalOpts), 1);
  }

  barHeight(val: number): number {
    return Math.round((val / this.maxTendencia()) * 64);
  }

  maxEmpresaScore(): number {
    if (!this.data?.rankingEmpresas?.length) return 100;
    return Math.max(...this.data.rankingEmpresas.map((e) => e.scorePromedio ?? 0), 1);
  }
}
