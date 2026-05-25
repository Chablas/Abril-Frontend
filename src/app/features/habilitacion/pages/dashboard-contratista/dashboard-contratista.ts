import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorService } from '../../../../core/services/error.service';
import { HabEmpresaService } from '../../services/hab-empresa.service';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import { EquipoHabService } from '../../services/equipo-hab.service';
import { ProyectoDisponibleDto, EmpresaEntregableDto } from '../../dtos/empresa.model';
import { ContratistaUsuarios } from './components/contratista-usuarios/contratista-usuarios';

interface ProgresoProyecto {
  total: number;
  aprobadosEquiv: number;
  rechazados: number;
}

@Component({
  selector: 'app-dashboard-contratista',
  standalone: true,
  imports: [CommonModule, RouterModule, ContratistaUsuarios],
  templateUrl: './dashboard-contratista.html',
  styleUrl: './dashboard-contratista.css',
})
export class DashboardContratista implements OnInit {
  empresaId: number | null = null;
  currentUserId: number | null = null;
  activeSection: 'resumen' | 'usuarios' = 'resumen';

  // Sec 1 — Proyectos
  proyectos: ProyectoDisponibleDto[] = [];
  loadingProyectos = true;
  progresoPorProyecto = new Map<number, ProgresoProyecto>();

  // Sec 2 — Entregables empresa
  proyectoSeleccionado: ProyectoDisponibleDto | null = null;
  entregables: EmpresaEntregableDto[] = [];
  loadingEntregables = false;

  // Sec 3 — Trabajadores
  totalTrabajadores = 0;
  trabHabilitados = 0;
  trabPendientes = 0;
  trabNoHabilitados = 0;
  loadingTrabajadores = true;

  // Sec 4 — Equipos
  totalEquipos = 0;
  equiposAutorizados = 0;
  equiposNoAutorizados = 0;
  loadingEquipos = true;

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  constructor(
    private habEmpresaService: HabEmpresaService,
    private trabajadorService: TrabajadorHabService,
    private equipoService: EquipoHabService,
    private authService: AuthService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isContratista()) {
      this.router.navigate(['/habilitacion/trabajadores']);
      return;
    }
    this.empresaId = this.authService.getEmpresaId() ?? null;
    const token = this.authService.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const sub = decoded.sub ?? decoded.userId ?? decoded.nameid;
        this.currentUserId = sub ? parseInt(String(sub), 10) : null;
      } catch { /* ignore */ }
    }
    if (!this.empresaId) return;
    this.loadProyectos();
    this.loadTrabajadores();
    this.loadEquipos();
  }

  private loadProyectos(): void {
    this.habEmpresaService.getProyectosDisponibles(this.empresaId!).subscribe({
      next: (res) => {
        this.proyectos = (res ?? []).filter((p) => p.estaActiva);
        this.loadingProyectos = false;
        if (this.proyectos.length > 0) {
          this.proyectoSeleccionado = this.proyectos[0];
          this.loadEntregablesPanel(this.proyectoSeleccionado.id);
          for (const p of this.proyectos) {
            this.habEmpresaService.getEntregables(this.empresaId!, p.id).subscribe({
              next: (items) => {
                const list = items ?? [];
                this.progresoPorProyecto.set(p.id, {
                  total: list.length,
                  aprobadosEquiv: list.filter(
                    (e) =>
                      e.estado === 'Aprobado' || e.estado === 'No Aplica' || e.estado === 'En Plazo',
                  ).length,
                  rechazados: list.filter((e) => e.estado === 'Rechazado').length,
                });
                this.cdr.detectChanges();
              },
              error: () => {},
            });
          }
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProyectos = false;
        this.errorService.handleError(err);
      },
    });
  }

  seleccionarProyecto(p: ProyectoDisponibleDto): void {
    if (this.proyectoSeleccionado?.id === p.id) return;
    this.proyectoSeleccionado = p;
    this.loadEntregablesPanel(p.id);
  }

  private loadEntregablesPanel(proyectoId: number): void {
    this.loadingEntregables = true;
    this.entregables = [];
    this.habEmpresaService.getEntregables(this.empresaId!, proyectoId).subscribe({
      next: (res) => {
        this.entregables = res ?? [];
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadTrabajadores(): void {
    this.trabajadorService
      .getTrabajadores({ empresaId: this.empresaId, pageSize: 1000 })
      .subscribe({
        next: (res) => {
          const list = res.data ?? [];
          this.totalTrabajadores = res.totalRecords;
          this.trabHabilitados = list.filter((w) => w.estadoHabilitacion === 'Habilitado').length;
          this.trabNoHabilitados = list.filter(
            (w) => w.estadoHabilitacion === 'No Autorizado',
          ).length;
          this.trabPendientes =
            this.totalTrabajadores - this.trabHabilitados - this.trabNoHabilitados;
          this.loadingTrabajadores = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingTrabajadores = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadEquipos(): void {
    this.equipoService.getEquipos({ empresaId: this.empresaId, pageSize: 1000 }).subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.totalEquipos = res.totalRecords;
        this.equiposAutorizados = list.filter((e) => e.estadoHabilitacion === 'Habilitado').length;
        this.equiposNoAutorizados = this.totalEquipos - this.equiposAutorizados;
        this.loadingEquipos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEquipos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Sec 1 helpers ──────────────────────────────────────────
  getBadge(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return 'En Proceso';
    if (p.rechazados > 0) return 'No Autorizado';
    if (p.total > 0 && p.aprobadosEquiv === p.total) return 'Autorizado';
    return 'En Proceso';
  }

  getBadgeClass(proyectoId: number): string {
    const b = this.getBadge(proyectoId);
    if (b === 'Autorizado') return 'badge badge--green';
    if (b === 'No Autorizado') return 'badge badge--red';
    return 'badge badge--amber';
  }

  // ── Sec 2 helpers ──────────────────────────────────────────
  get entAprobados(): number {
    return this.entregables.filter((e) => e.estado === 'Aprobado').length;
  }
  get entEnviados(): number {
    return this.entregables.filter((e) => e.estado === 'Enviado').length;
  }
  get entFalta(): number {
    return this.entregables.filter((e) => e.estado === 'Falta').length;
  }
  get entRechazados(): number {
    return this.entregables.filter((e) => e.estado === 'Rechazado').length;
  }
  get progresoEntregables(): number {
    if (!this.entregables.length) return 0;
    return Math.round((this.entAprobados / this.entregables.length) * 100);
  }

  // ── Sec 3 helpers ──────────────────────────────────────────
  get progresoTrabajadores(): number {
    if (!this.totalTrabajadores) return 0;
    return Math.round((this.trabHabilitados / this.totalTrabajadores) * 100);
  }

  // ── Sec 4 helpers ──────────────────────────────────────────
  get progresoEquipos(): number {
    if (!this.totalEquipos) return 0;
    return Math.round((this.equiposAutorizados / this.totalEquipos) * 100);
  }
}
