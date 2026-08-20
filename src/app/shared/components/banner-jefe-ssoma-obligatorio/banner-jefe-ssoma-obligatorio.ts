import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EvJefeSsomaBannerService } from '../../../core/services/ev-jefe-ssoma-banner.service';

const RUTA_EVALUACION = '/evaluaciones/evaluar-jefe-ssoma';

@Component({
  selector: 'app-banner-jefe-ssoma-obligatorio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './banner-jefe-ssoma-obligatorio.html',
  styleUrl: './banner-jefe-ssoma-obligatorio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerJefeSsomaObligatorio implements OnInit, OnDestroy {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  bannerSvc = inject(EvJefeSsomaBannerService);

  debeEvaluar = false;
  enRutaEvaluacion = false;

  ngOnInit(): void {
    this.bannerSvc.verificar();

    this.bannerSvc.debeEvaluar$.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.debeEvaluar = v;
      this.cdr.markForCheck();
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects.includes(RUTA_EVALUACION)),
        startWith(this.router.url.includes(RUTA_EVALUACION)),
        takeUntilDestroyed(),
      )
      .subscribe((v) => {
        this.enRutaEvaluacion = v;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {}

  irAEvaluar(): void {
    this.router.navigateByUrl(RUTA_EVALUACION);
  }
}
