import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HojaRutaService } from '../../hoja-ruta.service';
import { HojaRutaResumenDto } from '../../hoja-ruta.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { CharlasService } from '../../../charlas/services/charlas.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

function getIsoWeek(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

@Component({
  selector: 'app-hoja-ruta-resumen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './hoja-ruta-resumen.html',
  styleUrl: './hoja-ruta-resumen.css',
})
export class HojaRutaResumen implements OnInit {
  proyectos: { id: number; nombre: string }[] = [];
  empresas: { id: number; nombre: string }[] = [];

  proyectoId: number | null = null;
  contributorId: number | null = null;
  anio = new Date().getFullYear();
  numeroSemana = getIsoWeek(new Date());

  readonly anioFilterOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)
    .map((a) => ({ value: a, label: String(a) }));
  readonly semanaFilterOptions = Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `Semana ${i + 1}` }));

  resumen: HojaRutaResumenDto | null = null;
  loading = false;
  error = '';

  constructor(
    private hojaRutaService: HojaRutaService,
    private projectService: ProjectService,
    private charlasService: CharlasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200 }),
      miProyecto: this.charlasService.getMiProyecto().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ proyectos, miProyecto }) => {
        this.proyectos = proyectos.data
          .filter((p) => p.estado === 'ACTIVO')
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Precarga el proyecto del usuario logueado (mismo criterio que Charlas), para que
        // el Coordinador/Prevencionista no tenga que buscarlo cada vez que entra.
        if (miProyecto?.proyectoId && this.proyectos.some((p) => p.id === miProyecto.proyectoId)) {
          this.proyectoId = miProyecto.proyectoId;
          this.cargarContratistas();
        }

        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  puedeGenerar(): boolean {
    return !!(this.proyectoId && this.contributorId && this.anio && this.numeroSemana);
  }

  /** Se llama al cambiar el proyecto: la lista de contratistas depende de él, así que hay que
   *  recargarla (y descartar el contratista ya elegido, que puede no aplicar al nuevo proyecto)
   *  antes de intentar generar. */
  onProyectoChange(proyectoId: number | null): void {
    this.proyectoId = proyectoId;
    this.contributorId = null;
    this.empresas = [];
    this.resumen = null;
    if (proyectoId) this.cargarContratistas();
  }

  private cargarContratistas(): void {
    if (!this.proyectoId) return;
    this.hojaRutaService.getContratistasActivos(this.proyectoId).subscribe({
      next: (contratistas) => {
        this.empresas = contratistas
          .map((c) => ({ id: c.contributorId, nombre: c.nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  onFiltroChange(): void {
    if (this.puedeGenerar()) this.generar();
  }

  generar(): void {
    if (!this.puedeGenerar()) return;
    this.loading = true;
    this.error = '';
    this.loaderService.show();
    this.hojaRutaService
      .getResumen(this.contributorId!, this.proyectoId!, this.anio, this.numeroSemana)
      .subscribe({
        next: (res) => {
          this.resumen = res;
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

  estadoClass(estado: string): string {
    switch (estado) {
      case 'Cumple': return 'hr-badge hr-badge--cumple';
      case 'Pendiente': return 'hr-badge hr-badge--pendiente';
      case 'NoAplica': return 'hr-badge hr-badge--noaplica';
      case 'Informativo': return 'hr-badge hr-badge--informativo';
      case 'Manual': return 'hr-badge hr-badge--manual';
      default: return 'hr-badge';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'NoAplica': return 'No aplica';
      default: return estado;
    }
  }
}
