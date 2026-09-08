import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ActivosRotativosService } from '../../activos-rotativos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ActivoRotativoListDto,
  ActivoRotativoCategoriaDto,
  ActivoRotativoUpsertDto,
  ActivoRotativoEstado,
} from '../../activos-rotativos.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  id: number;
  nombre: string;
}

const ESTADOS: { value: ActivoRotativoEstado; label: string }[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_uso', label: 'En uso' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'baja', label: 'Baja' },
];

@Component({
  selector: 'app-activos-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    Paginator,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './activos-lista.html',
  styleUrl: './activos-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivosListaComponent implements OnInit {
  private svc = inject(ActivosRotativosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  readonly estados = ESTADOS;

  activos: ActivoRotativoListDto[] = [];
  categorias: ActivoRotativoCategoriaDto[] = [];
  proyectos: ProyectoSimple[] = [];
  loading = false;

  // Filtros
  searchText = '';
  filtroCategoriaId: number | null = null;
  filtroEstado: ActivoRotativoEstado | null = null;

  private readonly pager = new ClientPager<ActivoRotativoListDto>();

  get activosFiltrados(): ActivoRotativoListDto[] {
    return this.activos.filter((a) => {
      if (this.filtroCategoriaId && a.categoriaId !== this.filtroCategoriaId) return false;
      if (this.filtroEstado && a.estado !== this.filtroEstado) return false;
      if (this.searchText.trim() && !SearchInput.matches(`${a.nombre} ${a.codigo ?? ''}`, this.searchText)) {
        return false;
      }
      return true;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }
  get totalPages(): number {
    return this.pager.totalPages(this.activosFiltrados);
  }
  get activosPaged(): ActivoRotativoListDto[] {
    return this.pager.page(this.activosFiltrados);
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.markForCheck();
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.filtroCategoriaId = null;
    this.filtroEstado = null;
    this.onFilterChange();
  }

  get filtrosActivos(): boolean {
    return !!this.searchText.trim() || !!this.filtroCategoriaId || !!this.filtroEstado;
  }

  // ── Gestión de categorías ────────────────────────────────────────────────
  nuevaCategoriaNombre = '';
  creandoCategoria = false;

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.svc.getActivos().subscribe({
      next: (res) => {
        this.activos = res;
        this.pager.reset();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
    this.svc.getCategorias().subscribe({
      next: (res) => {
        this.categorias = res;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  crearCategoria(): void {
    const nombre = this.nuevaCategoriaNombre.trim();
    if (!nombre || this.creandoCategoria) return;
    this.creandoCategoria = true;
    this.cdr.markForCheck();
    this.svc.createCategoria({ nombre, orden: this.categorias.length + 1 }).subscribe({
      next: (c) => {
        this.categorias = [...this.categorias, c];
        this.nuevaCategoriaNombre = '';
        this.creandoCategoria = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.creandoCategoria = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  estadoLabel(estado: ActivoRotativoEstado): string {
    return ESTADOS.find((e) => e.value === estado)?.label ?? estado;
  }

  estadoClass(estado: ActivoRotativoEstado): string {
    switch (estado) {
      case 'disponible': return 'ar-badge--disponible';
      case 'en_uso': return 'ar-badge--en-uso';
      case 'mantenimiento': return 'ar-badge--mantenimiento';
      default: return 'ar-badge--baja';
    }
  }

  // ── Crear / Editar activo ────────────────────────────────────────────────
  showFormModal = false;
  editandoId: number | null = null;
  saving = false;
  form: ActivoRotativoUpsertDto = this.formVacio();

  private formVacio(): ActivoRotativoUpsertDto {
    return {
      nombre: '',
      categoriaId: 0,
      codigo: '',
      estado: 'disponible',
      proyectoActualId: undefined,
      responsableNombre: '',
      responsableTelefono: '',
      observaciones: '',
    };
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.form = this.formVacio();
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  abrirEditar(a: ActivoRotativoListDto): void {
    this.editandoId = a.id;
    this.form = {
      nombre: a.nombre,
      categoriaId: a.categoriaId,
      codigo: a.codigo,
      estado: a.estado,
      proyectoActualId: a.proyectoActualId,
      responsableNombre: a.responsableNombre,
      responsableTelefono: a.responsableTelefono,
      observaciones: '',
    };
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  cerrarFormModal(): void {
    this.showFormModal = false;
    this.cdr.markForCheck();
  }

  get canSubmitForm(): boolean {
    return !!(this.form.nombre.trim() && this.form.categoriaId && !this.saving);
  }

  guardarActivo(): void {
    if (!this.canSubmitForm) return;
    this.saving = true;
    this.cdr.markForCheck();

    const obs: Observable<unknown> = this.editandoId
      ? this.svc.updateActivo(this.editandoId, this.form)
      : this.svc.createActivo(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showFormModal = false;
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Mover activo a otro proyecto ─────────────────────────────────────────
  showMoverModal = false;
  moviendoActivo: ActivoRotativoListDto | null = null;
  nuevoProyectoId: number | null = null;
  observacionMovimiento = '';
  moviendo = false;

  abrirMover(a: ActivoRotativoListDto): void {
    this.moviendoActivo = a;
    this.nuevoProyectoId = a.proyectoActualId ?? null;
    this.observacionMovimiento = '';
    this.showMoverModal = true;
    this.cdr.markForCheck();
  }

  cerrarMoverModal(): void {
    this.showMoverModal = false;
    this.moviendoActivo = null;
    this.cdr.markForCheck();
  }

  confirmarMover(): void {
    if (!this.moviendoActivo || this.moviendo) return;
    this.moviendo = true;
    this.cdr.markForCheck();
    this.svc
      .moverActivo(this.moviendoActivo.id, {
        nuevoProyectoId: this.nuevoProyectoId ?? undefined,
        observacion: this.observacionMovimiento.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.moviendo = false;
          this.showMoverModal = false;
          Swal.fire({
            icon: 'success',
            title: 'Activo traspasado',
            timer: 2000,
            showConfirmButton: false,
          });
          this.cargarTodo();
        },
        error: (err: HttpErrorResponse) => {
          this.moviendo = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }
}
