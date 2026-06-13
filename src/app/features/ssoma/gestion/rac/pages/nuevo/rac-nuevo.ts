import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { RacService } from '../../services/rac.service';
import { RacCreateRequest, RacCategoriaDto, RacInfraccionDto } from '../../dtos/rac.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { CatalogosSaludService } from '../../../../salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../salud-ocupacional/dtos/catalogos.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rac-nuevo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './rac-nuevo.html',
  styleUrl: './rac-nuevo.css',
})
export class RacNuevo implements OnInit {
  pasoActual = 0;
  readonly totalPasos = 4;
  readonly pasoLabels = ['Ubicación', 'Observado', 'Detalle', 'Revisión'];
  guardando = false;
  loadingCatalogos = false;
  loadingNiveles = false;

  proyectos: any[] = [];
  categorias: RacCategoriaDto[] = [];
  categoriasFiltradas: RacCategoriaDto[] = [];
  infracciones: RacInfraccionDto[] = [];
  empresas: EmpresaSimpleDto[] = [];
  niveles: string[] = [];

  fotoFile: File | null = null;

  model: RacCreateRequest = {
    proyectoId: 0,
    tipo: '',
    categoriaId: 0,
    severidad: '',
    esAnonimoReportante: false,
    reportanteId: undefined,
    esAnonimoObservado: false,
    observadoWorkerId: undefined,
    descripcion: '',
    planAccion: '',
    fechaReporte: new Date().toISOString().split('T')[0],
    aplicaPenalidad: false,
  };

  constructor(
    private racService: RacService,
    private projectService: ProjectService,
    private catalogosSalud: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadingCatalogos = true;
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      categorias: this.racService.getCategorias(),
      infracciones: this.racService.getInfracciones(),
      empresas: this.catalogosSalud.getEmpresas(),
    }).subscribe({
      next: ({ proyectos, categorias, infracciones, empresas }) => {
        this.proyectos = proyectos.data;
        this.categorias = categorias;
        this.infracciones = infracciones;
        console.log('infracciones:', infracciones);
        this.empresas = empresas;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onProyectoChange(): void {
    this.model.proyectoPiso = undefined;
    this.niveles = [];
    if (!this.model.proyectoId) return;
    this.loadingNiveles = true;
    this.cdr.markForCheck();
    this.racService.getNiveles(this.model.proyectoId).subscribe({
      next: (niveles) => {
        this.niveles = niveles;
        this.loadingNiveles = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingNiveles = false;
        this.cdr.markForCheck();
      },
    });
  }

  onTipoChange(): void {
    this.model.categoriaId = 0;
    this.categoriasFiltradas = this.categorias.filter((c) => c.tipo === this.model.tipo);
  }

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fotoFile = input.files?.[0] ?? null;
    this.cdr.markForCheck();
  }

  // ── Infracciones filtradas por tipo ──────────────────────────────────────
  get infraccionesFiltradas(): RacInfraccionDto[] {
    if (!this.model.tipo) return this.infracciones;
    return this.infracciones.filter((i) => !i.tipo || i.tipo === this.model.tipo);
  }

  // ── Validación por paso ───────────────────────────────────────────────────
  get puedeAvanzar(): boolean {
    switch (this.pasoActual) {
      case 0: // Ubicación
        return (
          this.model.proyectoId > 0 &&
          !!this.model.proyectoPiso &&
          !!this.model.tipo &&
          this.model.categoriaId > 0 &&
          !!this.model.severidad
        );
      case 1: // Observado
        return !!this.model.empresaReportadaId && !!this.model.lugarDescripcion?.trim();
      case 2: // Detalle
        return (
          this.model.descripcion.trim().length >= 10 &&
          !!this.model.plazoLevantamiento
        );
      case 3: // Revisión
        return !this.guardando;
      default:
        return false;
    }
  }

  get todoCompleto(): boolean {
    return (
      this.model.proyectoId > 0 &&
      !!this.model.proyectoPiso &&
      !!this.model.tipo &&
      this.model.categoriaId > 0 &&
      !!this.model.severidad &&
      !!this.model.empresaReportadaId &&
      !!this.model.lugarDescripcion?.trim() &&
      this.model.descripcion.trim().length >= 10 &&
      !!this.model.plazoLevantamiento
    );
  }

  avanzar(): void {
    if (!this.puedeAvanzar) return;
    if (this.pasoActual < this.totalPasos - 1) {
      this.pasoActual++;
      this.cdr.markForCheck();
    }
  }

  retroceder(): void {
    if (this.pasoActual > 0) {
      this.pasoActual--;
      this.cdr.markForCheck();
    }
  }

  // ── Getters para resumen ──────────────────────────────────────────────────
  get proyectoSeleccionado(): any {
    return this.proyectos.find((p) => p.projectId === this.model.proyectoId);
  }

  get categoriaSeleccionada(): RacCategoriaDto | undefined {
    return this.categorias.find((c) => c.id === this.model.categoriaId);
  }

  get empresaSeleccionada(): EmpresaSimpleDto | undefined {
    return this.empresas.find((e) => e.id === this.model.empresaReportadaId);
  }

  get infraccionSeleccionada(): RacInfraccionDto | undefined {
    return this.infracciones.find((i) => i.id === this.model.infraccionId);
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  guardar(): void {
    if (this.guardando || !this.todoCompleto) return;
    this.guardando = true;
    this.loaderService.show();
    this.racService.crear(this.model).subscribe({
      next: (res) => {
        if (this.fotoFile) {
          this.racService.subirFoto(res.id, this.fotoFile, 'Hallazgo').subscribe({
            error: () => { /* foto falla silenciosamente, el RAC ya está creado */ },
          });
        }
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: '¡RAC creado!',
          text: `Código: ${res.codigo}`,
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          this.router.navigate(['/ssoma/gestion/rac', res.id]);
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/rac/lista']);
  }
}
