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
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rac-nuevo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './rac-nuevo.html',
  styleUrl: './rac-nuevo.css',
})
export class RacNuevo implements OnInit {
  pasoActual = 0;
  readonly totalPasos = 4;
  readonly pasoLabels = ['Proyecto', 'Observado', 'Descripción', 'Confirmar'];
  guardando = false;
  loadingCatalogos = false;

  proyectos: any[] = [];
  categorias: RacCategoriaDto[] = [];
  infracciones: RacInfraccionDto[] = [];
  categoriasFiltradas: RacCategoriaDto[] = [];

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
    }).subscribe({
      next: ({ proyectos, categorias, infracciones }) => {
        this.proyectos = proyectos.data;
        this.categorias = categorias;
        this.infracciones = infracciones;
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

  onTipoChange(): void {
    this.model.categoriaId = 0;
    this.categoriasFiltradas = this.categorias.filter((c) => c.tipo === this.model.tipo);
  }

  get puedeAvanzar(): boolean {
    switch (this.pasoActual) {
      case 0:
        return (
          this.model.proyectoId > 0 &&
          !!this.model.tipo &&
          this.model.categoriaId > 0 &&
          !!this.model.severidad
        );
      case 1:
        return true;
      case 2:
        return this.model.descripcion.trim().length >= 10;
      case 3:
        return true;
      default:
        return false;
    }
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

  get infraccionSeleccionada(): RacInfraccionDto | undefined {
    return this.infracciones.find((i) => i.id === this.model.infraccionId);
  }

  get proyectoSeleccionado(): any {
    return this.proyectos.find((p) => p.projectId === this.model.proyectoId);
  }

  get categoriaSeleccionada(): RacCategoriaDto | undefined {
    return this.categorias.find((c) => c.id === this.model.categoriaId);
  }

  guardar(): void {
    if (this.guardando) return;
    this.guardando = true;
    this.loaderService.show();
    this.racService.crear(this.model).subscribe({
      next: (res) => {
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
