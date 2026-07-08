import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, of, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { RacService } from '../../services/rac.service';
import { RacCategoriaDto, RacCreateRequest, RacInfraccionDto } from '../../dtos/rac.dtos';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { CatalogosSaludService } from '../../../../salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../salud-ocupacional/dtos/catalogos.model';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { compressImages } from '../../../../../../shared/utils/image-compress';

@Component({
  selector: 'app-rac-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './rac-nuevo.html',
  styleUrl: './rac-nuevo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacNuevo implements OnInit, OnDestroy {
  saving = false;
  loadingCatalogos = true;

  // Datos del evento
  proyectoId: number | null = null;
  fechaReporte = '';
  tipo = '';
  categoriaId: number | null = null;
  severidad = '';
  proyectoPiso = '';
  lugarDescripcion = '';
  descripcion = '';
  descripcionOcurrido = '';

  // Observador (reportante)
  esAnonimoReportante = false;
  reportanteQuery = '';
  reportanteResults: WorkerSearchItemDto[] = [];
  reportanteSelected: WorkerSearchItemDto | null = null;
  reportanteSearching = false;
  empresaReportanteId: number | null = null;

  // Trabajador(es) observado(s)
  esAnonimoObservado = false;
  esAnonimaEmpresaReportada = false;
  observadoQuery = '';
  observadoResults: WorkerSearchItemDto[] = [];
  observadosSeleccionados: WorkerSearchItemDto[] = [];
  observadoSearching = false;
  empresaReportadaId: number | null = null;

  // Fotos de evidencia
  fotosSeleccionadas: File[] = [];
  fotosSubiendo = false;

  // Plan de acción
  planAccion = '';
  plazoLevantamiento = '';

  // Penalidad
  aplicaPenalidad = false;
  infraccionId: number | null = null;

  // Catálogos
  categorias: RacCategoriaDto[] = [];
  infracciones: RacInfraccionDto[] = [];
  empresas: EmpresaSimpleDto[] = [];
  proyectos: ProjectGetDTO[] = [];

  readonly TIPO_OPCIONES = [
    { value: 'ACTO', label: 'Acto Subestándar' },
    { value: 'CONDICION', label: 'Condición Subestándar' },
  ];

  readonly SEVERIDAD_OPCIONES = [
    { value: 'CRITICO', label: 'Crítico' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'BAJO', label: 'Bajo' },
  ];

  private reportanteQuery$ = new Subject<string>();
  private observadoQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private racService: RacService,
    private workerSearch: WorkerSearchService,
    private catalogosSalud: CatalogosSaludService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCatalogos();
    this.reportanteQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runReportanteSearch(q));
    this.observadoQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runObservadoSearch(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCatalogos(): void {
    forkJoin({
      categorias: this.racService.getCategorias(),
      infracciones: this.racService.getInfracciones(),
      empresas: this.catalogosSalud.getEmpresas(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, estado: 'ACTIVO' }),
    }).subscribe({
      next: ({ categorias, infracciones, empresas, proyectos }) => {
        this.categorias = categorias;
        this.infracciones = infracciones;
        this.empresas = empresas;
        this.proyectos = proyectos.data;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Observador search ─────────────────────────────────────────────

  onReportanteQueryChange(value: string): void {
    this.reportanteQuery = value;
    if (!value || value.trim().length < 2) {
      this.reportanteResults = [];
      return;
    }
    this.reportanteSearching = true;
    this.reportanteQuery$.next(value.trim());
  }

  private runReportanteSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => {
        this.reportanteResults = res;
        this.reportanteSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reportanteResults = [];
        this.reportanteSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectReportante(w: WorkerSearchItemDto): void {
    this.reportanteSelected = w;
    this.reportanteQuery = w.apellidoNombre;
    this.reportanteResults = [];
    if (w.empresaActualId && !this.empresaReportanteId) {
      this.empresaReportanteId = w.empresaActualId;
    }
    this.cdr.markForCheck();
  }

  clearReportante(): void {
    this.reportanteSelected = null;
    this.reportanteQuery = '';
    this.reportanteResults = [];
    this.cdr.markForCheck();
  }

  // ── Observado search ──────────────────────────────────────────────

  onObservadoQueryChange(value: string): void {
    this.observadoQuery = value;
    if (!value || value.trim().length < 2) {
      this.observadoResults = [];
      return;
    }
    this.observadoSearching = true;
    this.observadoQuery$.next(value.trim());
  }

  private runObservadoSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => {
        this.observadoResults = res.filter(
          (r) => !this.observadosSeleccionados.some((s) => s.id === r.id),
        );
        this.observadoSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.observadoResults = [];
        this.observadoSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  addObservado(w: WorkerSearchItemDto): void {
    if (!this.observadosSeleccionados.some((s) => s.id === w.id)) {
      this.observadosSeleccionados = [...this.observadosSeleccionados, w];
      if (w.empresaActualId && !this.empresaReportadaId) {
        this.empresaReportadaId = w.empresaActualId;
      }
    }
    this.observadoQuery = '';
    this.observadoResults = [];
    this.cdr.markForCheck();
  }

  removeObservado(id: number): void {
    this.observadosSeleccionados = this.observadosSeleccionados.filter((s) => s.id !== id);
    this.cdr.markForCheck();
  }

  // ── Submit ────────────────────────────────────────────────────────

  get canSubmit(): boolean {
    return !!(
      this.proyectoId &&
      this.fechaReporte &&
      this.tipo &&
      this.categoriaId &&
      this.severidad &&
      this.descripcion.trim() &&
      this.planAccion.trim() &&
      this.plazoLevantamiento &&
      this.empresaReportadaId &&
      this.empresaReportanteId &&
      this.fotosSeleccionadas.length > 0 &&
      !this.saving
    );
  }

  onFotosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const seleccionadas = Array.from(input.files ?? []);
    this.cdr.markForCheck();
    // Las fotos de cámara pueden pesar 8-15MB; comprimirlas antes de subir evita
    // que la subida falle por timeout en datos móviles.
    compressImages(seleccionadas).then((comprimidas) => {
      this.fotosSeleccionadas = comprimidas;
      this.cdr.markForCheck();
    });
  }

  submit(): void {
    if (!this.canSubmit) return;

    const req: RacCreateRequest = {
      proyectoId: this.proyectoId!,
      tipo: this.tipo,
      categoriaId: this.categoriaId!,
      severidad: this.severidad,
      esAnonimoReportante: this.esAnonimoReportante,
      reportanteId: this.reportanteSelected?.id,
      reportanteCargo: this.reportanteSelected?.cargo,
      empresaReportanteId: this.empresaReportanteId ?? undefined,
      esAnonimoObservado: this.esAnonimoObservado,
      observadoWorkerIds: this.observadosSeleccionados.map((w) => w.id),
      empresaReportadaId: this.empresaReportadaId ?? undefined,
      proyectoPiso: this.proyectoPiso || undefined,
      lugarDescripcion: this.lugarDescripcion || undefined,
      descripcion: this.descripcion,
      descripcionOcurrido: this.descripcionOcurrido || undefined,
      planAccion: this.planAccion || undefined,
      fechaReporte: this.fechaReporte,
      plazoLevantamiento: this.plazoLevantamiento || undefined,
      aplicaPenalidad: this.aplicaPenalidad,
      infraccionId: this.aplicaPenalidad && this.infraccionId ? this.infraccionId : undefined,
    };

    this.saving = true;
    this.loaderService.show();
    this.racService.crear(req).subscribe({
      next: (res) => {
        const mostrarSwalYNavegar = (fotosFallaron = false) => {
          this.saving = false;
          this.fotosSubiendo = false;
          this.loaderService.hide();
          Swal.fire({
            icon: fotosFallaron ? 'warning' : 'success',
            title: fotosFallaron ? 'RAC registrado, pero las fotos no se pudieron subir' : 'RAC registrado',
            html: fotosFallaron
              ? `Código: <b>${res.codigo}</b><br>Vuelve a intentar subir las fotos desde el detalle del RAC.`
              : `Código: <b>${res.codigo}</b>`,
            timer: fotosFallaron ? undefined : 2500,
            showConfirmButton: fotosFallaron,
          }).then(() => this.router.navigate(['/ssoma/gestion/rac/lista']));
        };

        if (this.fotosSeleccionadas.length > 0) {
          this.fotosSubiendo = true;
          // catchError por foto: una falla individual (típico en datos móviles) no debe
          // tumbar la subida de las demás ni reportar "todo falló" cuando en realidad
          // solo una imagen no llegó.
          forkJoin(
            this.fotosSeleccionadas.map(f =>
              this.racService.subirFoto(res.id, f, 'Observacion').pipe(catchError(() => of(null))),
            ),
          ).subscribe((resultados) => {
            const algunaFallo = resultados.some((r) => r === null);
            mostrarSwalYNavegar(algunaFallo);
          });
        } else {
          mostrarSwalYNavegar(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/rac/dashboard']);
  }
}
