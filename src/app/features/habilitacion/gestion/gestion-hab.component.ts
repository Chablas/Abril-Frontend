import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { DashboardHabService } from '../../../core/services/dashboard-hab.service';
import { DashboardAdminDto } from '../../../core/dtos/habilitacion/dashboard-hab.model';

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

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

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
    { label: 'Dashboard',     path: 'dashboard',    icon: 'tab-icon-dashboard' },
    { label: 'Trabajadores',  path: 'trabajadores',  icon: 'tab-icon-workers'  },
    { label: 'Empresa',       path: 'empresa',       icon: 'tab-icon-empresa'  },
    { label: 'Equipos',       path: 'equipos',       icon: 'tab-icon-equipos'  },
    { label: 'Bandeja',       path: 'bandeja',       icon: 'tab-icon-bandeja'  },
    { label: 'SCTR / Vida Ley', path: 'sctr-vidaley', icon: 'tab-icon-sctr'   },
    { label: 'Inducciones',   path: 'inducciones',   icon: 'tab-icon-induccion'},
    { label: 'Dossier',       path: 'dossier',       icon: 'tab-icon-dossier'  },
  ];

  constructor(
    private dashboardService: DashboardHabService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadResumen();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
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
