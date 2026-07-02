import { Component, OnDestroy, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { SidebarMobile } from '../sidebar-mobile/sidebar-mobile';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { SessionRefreshService } from '../../../core/services/session-refresh.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header, SidebarMobile, NgIf],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnDestroy {
  mobileMenuOpen = false;

  private layoutService = inject(LayoutService);
  private sessionRefresh = inject(SessionRefreshService);
  private realtime = inject(RealtimeService);

  constructor(private router: Router) {
    this.layoutService.openMobileMenu$
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.mobileMenuOpen = true));

    // Mientras el usuario está en la zona autenticada:
    // - refresco periódico del token (red de seguridad),
    // - conexión SignalR para refrescar al instante ante cambios de rol/permisos.
    this.sessionRefresh.start();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.sessionRefresh.stop();
    this.realtime.stop();
  }

  isFullPage(): boolean {
    return (
      this.router.url.includes('/habilitacion/trabajadores') ||
      this.router.url.includes('/arquitectura-comercial/dashboard') ||
      this.router.url.includes('/arquitectura-comercial/actividades') ||
      this.router.url.includes('/arquitectura-comercial/gantt') ||
      this.router.url.includes('/arquitectura-comercial/plantilla') ||
      this.router.url.includes('/clinica/dashboard') ||
      this.router.url.includes('/clinica/agenda') ||
      this.router.url.includes('/clinica/interconsultas') ||
      this.router.url.includes('/clinica/programaciones') ||
      this.router.url.includes('/habilitacion/dashboard-contratista') ||
      this.router.url.includes('/evaluaciones/dashboard') ||
      this.router.url.includes('/evaluaciones/evaluar') ||
      this.router.url.includes('/evaluaciones/historial') ||
      this.router.url.includes('/evaluaciones/configuracion') ||
      this.router.url.includes('/mejora-continua') ||
      this.router.url.includes('/ssoma/salud-ocupacional') ||
      this.router.url.includes('/ssoma/gestion/paso') ||
      this.router.url.includes('/ssoma/gestion/rac') ||
      this.router.url.includes('/ssoma/gestion/opt') ||
      this.router.url.includes('/ssoma/gestion/inspeccion') ||
      this.router.url.includes('/ssoma/gestion/amonestaciones') ||
      this.router.url.includes('/habilitacion/gestion') ||
      this.router.url.includes('/gestion-administrativa') ||
      this.router.url.includes('/projects') ||
      this.router.url.includes('/contractors/management') ||
      this.router.url.includes('/costs/dashboard') ||
      this.router.url.includes('/costs/adjudicaciones') ||
      this.router.url.includes('/costs/configuration') ||
      this.router.url.includes('/vecinos') ||
      this.router.url.includes('/habilitacion/control-acceso') ||
      this.router.url.includes('/security') ||
      this.router.url.includes('/configuracion')
    );
  }
}
