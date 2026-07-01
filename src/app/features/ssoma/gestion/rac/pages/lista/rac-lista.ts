import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { RacService } from '../../services/rac.service';
import { RacListItemDto, RacListQuery, RacPagedResult } from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

@Component({
  selector: 'app-rac-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './rac-lista.html',
  styleUrl: './rac-lista.css',
})
export class RacLista implements OnInit {
  result: RacPagedResult<RacListItemDto> | null = null;
  loading = false;
  query: RacListQuery = { page: 1, pageSize: 20 };

  filtroEstado = '';
  filtroSeveridad = '';
  filtroTipo = '';
  filtroSoloConPenalidad = false;
  filtroProyectoId: number | null = null;
  filtroEmpresaId: number | null = null;
  filtrosAbiertos = false;
  readonly anioActual = new Date().getFullYear();

  proyectos: { id: number; nombre: string }[] = [];
  empresas: { id: number; razonSocial: string }[] = [];

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private projectService: ProjectService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  ngOnInit(): void {
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
      empresas: this.authService.getEmpresasContratistas(),
    }).subscribe({
      next: ({ proyectos, empresas }) => {
        this.proyectos = proyectos.data
          .filter(p => p.estado === 'ACTIVO')
          .map(p => ({ id: p.projectId, nombre: p.projectDescription }));
        this.empresas = empresas.map(e => ({ id: e.id, razonSocial: e.razonSocial }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    // Restaurar filtros al volver de cerrar/ver un RAC (evita tener que re-filtrar cada vez).
    const previos = this.racService.listFiltrosState;
    if (previos) {
      this.filtroEstado = previos.filtroEstado;
      this.filtroSeveridad = previos.filtroSeveridad;
      this.filtroTipo = previos.filtroTipo;
      this.filtroSoloConPenalidad = previos.filtroSoloConPenalidad;
      this.filtroProyectoId = previos.filtroProyectoId;
      this.filtroEmpresaId = previos.filtroEmpresaId;
      this.query = { ...this.query, page: previos.page };
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: RacListQuery = {
      ...this.query,
      estado: this.filtroEstado || undefined,
      severidad: this.filtroSeveridad || undefined,
      tipo: this.filtroTipo || undefined,
      soloConPenalidad: this.filtroSoloConPenalidad || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      empresaReportadaId: this.filtroEmpresaId ?? undefined,
    };
    this.query = q;
    this.racService.listFiltrosState = {
      filtroEstado: this.filtroEstado,
      filtroSeveridad: this.filtroSeveridad,
      filtroTipo: this.filtroTipo,
      filtroSoloConPenalidad: this.filtroSoloConPenalidad,
      filtroProyectoId: this.filtroProyectoId,
      filtroEmpresaId: this.filtroEmpresaId,
      page: q.page ?? 1,
    };
    this.racService.getList(q).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  buscar(): void {
    this.query = { ...this.query, page: 1 };
    this.load();
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroSeveridad = '';
    this.filtroTipo = '';
    this.filtroSoloConPenalidad = false;
    this.filtroProyectoId = null;
    this.filtroEmpresaId = null;
    this.query = { ...this.query, page: 1 };
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/rac', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/rac/nuevo']);
  }

  irACerrar(id: number): void {
    this.router.navigate(['/ssoma/gestion/rac', id, 'cerrar']);
  }

  descargarPdf(id: number): void {
    this.loaderService.show();
    this.racService.getReportePdf(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RAC-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: () => {
        this.loaderService.hide();
      },
    });
  }

  puedeVerBotonCerrar(item: RacListItemDto): boolean {
    return item.estado !== 'Cerrado';
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroEstado || this.filtroSeveridad || this.filtroTipo || this.filtroSoloConPenalidad
      || this.filtroProyectoId || this.filtroEmpresaId);
  }

  severidadClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      case 'BAJO':    return 'badge-bajo';
      default:        return 'badge-default';
    }
  }

  severidadDotClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'dot--critico';
      case 'ALTO':    return 'dot--alto';
      case 'MEDIO':   return 'dot--medio';
      case 'BAJO':    return 'dot--bajo';
      default:        return 'dot--default';
    }
  }

  estadoClass(est: string): string {
    switch (est) {
      case 'Abierto':     return 'estado-abierto';
      case 'Cerrado':     return 'estado-cerrado';
      case 'Vencido':     return 'estado-vencido';
      case 'En proceso':  return 'estado-proceso';
      default:            return '';
    }
  }
}
