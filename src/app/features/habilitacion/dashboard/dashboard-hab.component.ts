import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardHabService } from '../../../core/services/dashboard-hab.service';
import {
  DashboardAdminDto,
  EmpresaRiesgoDto,
  WorkerRiesgoDto,
  ProyectoEstadoDto,
  VencimientoProximoDto,
} from '../../../core/dtos/habilitacion/dashboard-hab.model';

@Component({
  selector: 'app-dashboard-hab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-hab.component.html',
  styleUrl: './dashboard-hab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHabComponent implements OnInit {
  loading = true;
  data: DashboardAdminDto | null = null;

  get isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR DE UDP') ||
      this.authService.hasRole('ADMINISTRADOR DEL SISTEMA')
    );
  }

  get kpis() {
    return this.data?.kpis;
  }

  get empresasEnRiesgo(): EmpresaRiesgoDto[] {
    return this.data?.empresasEnRiesgo ?? [];
  }

  get workersEnRiesgo(): WorkerRiesgoDto[] {
    return this.data?.workersEnRiesgo ?? [];
  }

  get estadoPorProyecto(): ProyectoEstadoDto[] {
    return this.data?.estadoPorProyecto ?? [];
  }

  get vencimientosProximos(): VencimientoProximoDto[] {
    return this.data?.vencimientosProximos ?? [];
  }

  constructor(
    private dashboardService: DashboardHabService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dashboardService.getResumen().subscribe({
      next: (res) => {
        console.log('DASHBOARD DATA:', JSON.stringify(res, null, 2));
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  riesgoClass(nivel: string): string {
    switch (nivel?.toUpperCase()) {
      case 'ALTO':  return 'badge-riesgo-alto';
      case 'MEDIO': return 'badge-riesgo-medio';
      default:      return 'badge-riesgo-bajo';
    }
  }

  diasClass(dias: number): string {
    if (dias <= 7)  return 'dias-rojo';
    if (dias <= 15) return 'dias-naranja';
    return 'dias-verde';
  }

  pct(parte: number, total: number): number {
    return total ? Math.round((parte / total) * 100) : 0;
  }

  entidadTipoLabel(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'TRABAJADOR': return 'Trabajador';
      case 'EMPRESA':    return 'Empresa';
      case 'EQUIPO':     return 'Equipo';
      default:           return tipo;
    }
  }
}
