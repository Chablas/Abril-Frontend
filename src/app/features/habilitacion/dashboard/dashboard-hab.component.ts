import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardHabService } from '../../../core/services/dashboard-hab.service';
import { HabEmpresaService } from '../services/hab-empresa.service';
import { TrabajadorHabService } from '../services/trabajador-hab.service';
import { EquipoHabService } from '../services/equipo-hab.service';
import { HabUiService } from '../services/hab-ui.service';
import { ContratistaUsuarios } from '../pages/dashboard-contratista/components/contratista-usuarios/contratista-usuarios';
import {
  DashboardAdminDto,
  EmpresaRiesgoDto,
  WorkerRiesgoDto,
  ProyectoEstadoDto,
  VencimientoProximoDto,
} from '../../../core/dtos/habilitacion/dashboard-hab.model';
import { EmpresaEntregableDto, EmpresaProyectoDto } from '../dtos/empresa.model';

interface ProgresoProyecto {
  total: number; aprobadosEquiv: number; rechazados: number; porcentaje: number;
}

@Component({
  selector: 'app-dashboard-hab',
  standalone: true,
  imports: [CommonModule, RouterModule, ContratistaUsuarios],
  templateUrl: './dashboard-hab.component.html',
  styleUrl: './dashboard-hab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHabComponent implements OnInit {
  // ── Admin ──
  loading = true;
  data: DashboardAdminDto | null = null;

  // ── Contratista ──
  get activeSection(): 'resumen' | 'usuarios' { return this.habUiService.current; }
  empresaId: number | null = null;
  currentUserId: number | null = null;
  proyectos: EmpresaProyectoDto[] = [];
  loadingProyectos = true;
  progresoPorProyecto = new Map<number, ProgresoProyecto>();
  entregablesPorProyecto = new Map<number, EmpresaEntregableDto[]>();
  proyectoTabSeleccionado = 0;
  totalTrabajadores = 0;
  trabHabilitados = 0;
  trabNoHabilitados = 0;
  loadingTrabajadores = true;
  topNoHabilitados: { nombre: string; motivo: string }[] = [];
  totalEquipos = 0;
  proximosVencer: any[] = [];

  get esContratista(): boolean { return this.authService.isContratista(); }

  get isAdmin(): boolean {
    return this.authService.hasRole('ADMINISTRADOR DE UDP') ||
           this.authService.hasRole('ADMINISTRADOR DEL SISTEMA');
  }

  get empresaNombre(): string {
    if (typeof localStorage === 'undefined') return '';
    try { return JSON.parse(localStorage.getItem('user') ?? '{}').razonSocial ?? ''; } catch { return ''; }
  }

  // Admin getters
  get kpis() { return this.data?.kpis; }
  get empresasEnRiesgo(): EmpresaRiesgoDto[] { return this.data?.empresasEnRiesgo ?? []; }
  get workersEnRiesgo(): WorkerRiesgoDto[] { return this.data?.workersEnRiesgo ?? []; }
  get estadoPorProyecto(): ProyectoEstadoDto[] { return this.data?.estadoPorProyecto ?? []; }
  get vencimientosProximos(): VencimientoProximoDto[] { return this.data?.vencimientosProximos ?? []; }

  // Contratista getters
  get proyectoTabActual(): EmpresaProyectoDto | null { return this.proyectos[this.proyectoTabSeleccionado] ?? null; }
  get entregablesTabActual(): EmpresaEntregableDto[] {
    const p = this.proyectoTabActual;
    return p ? (this.entregablesPorProyecto.get(p.proyectoId) ?? []) : [];
  }
  get entregablesAprobados(): number { return this.entregablesTabActual.filter(e => e.estado === 'Aprobado').length; }
  get entregablesFalta(): number { return this.entregablesTabActual.filter(e => e.estado === 'Falta' || e.estado === 'Rechazado').length; }
  get entregablesEnviados(): number { return this.entregablesTabActual.filter(e => e.estado === 'Enviado').length; }
  get pctEntregables(): number { const t = this.entregablesTabActual.length; return t ? Math.round((this.entregablesAprobados / t) * 100) : 0; }
  get totalEntregables(): number { return this.entregablesTabActual.length; }
  get pctHabilitados(): number { return this.totalTrabajadores ? Math.round((this.trabHabilitados / this.totalTrabajadores) * 100) : 0; }
  get totalProyectosActivos(): number { return this.proyectos.length; }
  get alertasCount(): number { return this.trabNoHabilitados; }
  get ringOffset(): number { return 125.7 - (this.pctEntregables / 100) * 125.7; }
  get ringOffsetTasa(): number { return 106.8 - (this.pctHabilitados / 100) * 106.8; }

  colorProyecto(idx: number): string {
    return ['#22c55e','#f59e0b','#3b82f6','#a855f7','#ef4444'][idx % 5];
  }
  diasClass(dias: number): string { return dias <= 7 ? 'dias-r' : dias <= 14 ? 'dias-o' : 'dias-y'; }
  iniciales(nombre: string): string { return nombre.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase(); }
  selectTab(idx: number): void { this.proyectoTabSeleccionado = idx; this.cdr.detectChanges(); }

  constructor(
    private dashboardService: DashboardHabService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private habEmpresaService: HabEmpresaService,
    private trabajadorService: TrabajadorHabService,
    private equipoService: EquipoHabService,
    private habUiService: HabUiService,
  ) {}

  ngOnInit(): void {
    if (this.esContratista) {
      this.empresaId = this.authService.getEmpresaId() ?? null;
      const token = this.authService.getToken();
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          const sub = decoded.sub ?? decoded.userId ?? decoded.nameid ??
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
          this.currentUserId = sub != null ? parseInt(String(sub), 10) : null;
        } catch { }
      }
      if (this.empresaId) {
        this.loadProyectos();
        this.loadTrabajadores();
      }
    } else {
      this.load();
    }
  }

  // ── Admin ──
  load(): void {
    this.loading = true;
    this.dashboardService.getResumen().subscribe({
      next: (res) => { this.data = res; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  // ── Contratista ──
  loadProyectos(): void {
    this.loadingProyectos = true;
    this.habEmpresaService.getProyectos(this.empresaId!).subscribe({
      next: (ps) => {
        this.proyectos = ps;
        ps.forEach(p => this.loadEntregablesProyecto(p));
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingProyectos = false; },
    });
  }

  loadEntregablesProyecto(p: EmpresaProyectoDto): void {
    this.habEmpresaService.getEntregables(this.empresaId!, p.proyectoId).subscribe({
      next: (ents) => {
        this.entregablesPorProyecto.set(p.proyectoId, ents);
        const total = ents.length;
        const aprobados = ents.filter(e => e.estado === 'Aprobado').length;
        this.progresoPorProyecto.set(p.proyectoId, {
          total, aprobadosEquiv: aprobados,
          rechazados: ents.filter(e => e.estado === 'Rechazado').length,
          porcentaje: total ? Math.round((aprobados / total) * 100) : 0,
        });
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadTrabajadores(): void {
    this.loadingTrabajadores = true;
    this.trabajadorService.getTrabajadores({ empresaId: this.empresaId!, page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        const workers = res.data ?? [];
        this.totalTrabajadores = res.totalRecords ?? workers.length;
        this.trabHabilitados = workers.filter(w => w.estadoHabilitacion === 'Habilitado').length;
        this.trabNoHabilitados = workers.filter(w => w.estadoHabilitacion === 'No Autorizado').length;
        this.topNoHabilitados = workers
          .filter(w => w.estadoHabilitacion === 'No Autorizado').slice(0, 5)
          .map(w => ({ nombre: w.apellidoNombre ?? '—', motivo: 'No autorizado' }));
        this.loadingTrabajadores = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingTrabajadores = false; },
    });
  }

  riesgoClass(nivel: string): string {
    switch (nivel?.toUpperCase()) {
      case 'ALTO':  return 'badge-riesgo-alto';
      case 'MEDIO': return 'badge-riesgo-medio';
      default:      return 'badge-riesgo-bajo';
    }
  }
  diasClassAdmin(dias: number): string {
    if (dias <= 7)  return 'dias-rojo';
    if (dias <= 15) return 'dias-naranja';
    return 'dias-verde';
  }
  pct(parte: number, total: number): number { return total ? Math.round((parte / total) * 100) : 0; }
  entidadTipoLabel(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'TRABAJADOR': return 'Trabajador';
      case 'EMPRESA':    return 'Empresa';
      case 'EQUIPO':     return 'Equipo';
      default:           return tipo;
    }
  }

  getWhatsappUrl(): string { return 'https://chat.whatsapp.com/'; }
}
