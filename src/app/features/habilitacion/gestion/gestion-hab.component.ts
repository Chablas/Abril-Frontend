import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../shared/components/abril-page-header/abril-page-header.component';
import { DashboardHabService } from '../../../core/services/dashboard-hab.service';
import { DashboardAdminDto } from '../../../core/dtos/habilitacion/dashboard-hab.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-gestion-hab',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, AbrilPageHeaderComponent],
  templateUrl: './gestion-hab.component.html',
  styleUrl: './gestion-hab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionHabComponent implements OnInit, OnDestroy {
  resumen: DashboardAdminDto | null = null;
  refreshing = false;
  contratistaTabsConActivo: AbrilPageTab[] = this.buildContratistaTabs();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  get empresasTotal(): number {
    return this.resumen?.kpis?.empresasTotal ?? 0;
  }

  get workersTotal(): number {
    return this.resumen?.kpis?.workersTotal ?? 0;
  }

  get entregablesVencidos(): number {
    return this.resumen?.kpis?.entregablesVencidos ?? 0;
  }

  readonly tabs = [
    { label: 'Dashboard',       path: 'dashboard',    icon: 'tab-icon-dashboard' },
    { label: 'Trabajadores',    path: 'trabajadores', icon: 'tab-icon-workers'   },
    { label: 'Empresa',         path: 'empresa',      icon: 'tab-icon-empresa'   },
    { label: 'Equipos',         path: 'equipos',      icon: 'tab-icon-equipos'   },
    { label: 'Bandeja',         path: 'bandeja',      icon: 'tab-icon-bandeja'   },
    { label: 'SCTR / Vida Ley', path: 'sctr-vidaley', icon: 'tab-icon-sctr'      },
    { label: 'Inducciones',     path: 'inducciones',  icon: 'tab-icon-induccion' },
    { label: 'Dossier',         path: 'dossier',      icon: 'tab-icon-dossier'   },
  ];

  constructor(
    private dashboardService: DashboardHabService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadResumen();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private buildContratistaTabs(): AbrilPageTab[] {
    return [
      { label: 'Panel',        icono: 'ti-layout-dashboard', route: '/habilitacion/gestion/dashboard' },
      { label: 'Trabajadores', icono: 'ti-users',            route: '/habilitacion/gestion/trabajadores' },
      { label: 'Empresa',      icono: 'ti-building',         route: '/habilitacion/gestion/empresa' },
      { label: 'Equipos',      icono: 'ti-truck',            route: '/habilitacion/gestion/equipos' },
      { label: 'SCTR',         icono: 'ti-shield-check',     route: '/habilitacion/gestion/sctr-vidaley' },
      { label: 'Inducciones',  icono: 'ti-school',           route: '/habilitacion/gestion/inducciones' },
      { label: 'Usuarios',     icono: 'ti-users-group',      route: '/habilitacion/gestion/usuarios' },
      { label: 'Dossier',      icono: 'ti-folder',           route: '/habilitacion/gestion/dossier' },
    ];
  }

  loadResumen(): void {
    this.refreshing = true;
    this.dashboardService.getResumen().subscribe({
      next: (res) => {
        this.resumen = res;
        this.refreshing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.refreshing = false;
        this.cdr.detectChanges();
      },
    });
  }

  onRefresh(): void {
    if (this.refreshing) return;
    this.loadResumen();
  }
}
