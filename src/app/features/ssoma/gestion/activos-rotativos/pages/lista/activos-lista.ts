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
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ActivoRotativoListDto,
  ActivoRotativoUpsertDto,
  ActivoRotativoEstado,
  ActivoRotativoMaterialDto,
  PresupuestoItemBuscarDto,
  ResponsableSsomaDto,
} from '../../activos-rotativos.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
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
  private authSvc = inject(AuthService);

  // Eliminar un activo es irreversible (no queda historial); restringido al mismo
  // correo autorizado que en el backend (ver PuedeEliminar en ActivoRotativoController).
  get puedeEliminarActivo(): boolean {
    return (this.authSvc.getUserEmail() ?? '').toLowerCase() === 'sjustiniani@abril.pe';
  }

  readonly estados = ESTADOS;

  tab: 'lista' | 'control-s10' = 'lista';

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Activos', icono: 'ti-package', active: this.tab === 'lista' },
      { label: 'Control S10', icono: 'ti-file-analytics', active: this.tab === 'control-s10' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    this.tab = t.label === 'Activos' ? 'lista' : 'control-s10';
    this.cdr.markForCheck();
  }

  activos: ActivoRotativoListDto[] = [];
  materiales: ActivoRotativoMaterialDto[] = [];
  proyectos: ProyectoSimple[] = [];
  responsables: ResponsableSsomaDto[] = [];
  loading = false;

  // Filtros
  searchText = '';
  filtroEstado: ActivoRotativoEstado | null = null;

  private readonly pager = new ClientPager<ActivoRotativoListDto>();

  get activosFiltrados(): ActivoRotativoListDto[] {
    return this.activos.filter((a) => {
      if (this.filtroEstado && a.estado !== this.filtroEstado) return false;
      if (this.searchText.trim() && !SearchInput.matches(`${a.materialNombre} ${a.codigo ?? ''}`, this.searchText)) {
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
    this.filtroEstado = null;
    this.onFilterChange();
  }

  get filtrosActivos(): boolean {
    return !!this.searchText.trim() || !!this.filtroEstado;
  }

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
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.svc.getMateriales().subscribe({
      next: (res) => {
        this.materiales = res.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.svc.getResponsablesSsoma().subscribe({
      next: (res) => {
        this.responsables = res;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Control S10: vincular un Material al catálogo de Presupuesto Materiales ──
  vinculandoMaterial: ActivoRotativoMaterialDto | null = null;
  vincularQuery = '';
  vincularResultados: PresupuestoItemBuscarDto[] = [];
  vincularBuscando = false;
  private vincularTimeoutId: ReturnType<typeof setTimeout> | null = null;

  abrirVincular(m: ActivoRotativoMaterialDto): void {
    this.vinculandoMaterial = m;
    this.vincularQuery = '';
    this.vincularResultados = [];
    this.cdr.markForCheck();
  }

  cerrarVincular(): void {
    this.vinculandoMaterial = null;
    this.cdr.markForCheck();
  }

  onVincularQueryChange(q: string): void {
    this.vincularQuery = q;
    if (this.vincularTimeoutId) clearTimeout(this.vincularTimeoutId);
    if (!q || q.trim().length < 2) {
      this.vincularResultados = [];
      return;
    }
    this.vincularBuscando = true;
    this.vincularTimeoutId = setTimeout(() => {
      this.svc.buscarItemPresupuesto(q.trim()).subscribe({
        next: (res) => {
          this.vincularResultados = res;
          this.vincularBuscando = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.vincularBuscando = false;
          this.cdr.markForCheck();
        },
      });
    }, 300);
  }

  seleccionarItemPresupuesto(item: PresupuestoItemBuscarDto): void {
    if (!this.vinculandoMaterial) return;
    const m = this.vinculandoMaterial;
    this.svc.updateMaterial(m.id, { nombre: m.nombre, orden: m.orden, presupuestoItemId: item.id }).subscribe({
      next: () => {
        this.cerrarVincular();
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  desvincularItemPresupuesto(m: ActivoRotativoMaterialDto): void {
    this.svc.updateMaterial(m.id, { nombre: m.nombre, orden: m.orden, presupuestoItemId: null }).subscribe({
      next: () => this.cargarTodo(),
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // Solo se puede borrar un material sin activos registrados — típicamente
  // los que se crearon de prueba y nunca se usaron (ej. "Arnés/Eslinga").
  eliminarMaterial(m: ActivoRotativoMaterialDto): void {
    Swal.fire({
      icon: 'warning',
      title: `¿Eliminar "${m.nombre}" del catálogo?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deleteMaterial(m.id).subscribe({
        next: () => {
          this.materiales = this.materiales.filter((x) => x.id !== m.id);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  // ── Agregar material nuevo: se busca directo en el catálogo de S10, no se
  // escribe el nombre a mano — así siempre queda vinculado desde el inicio. ──
  nuevoMaterialQuery = '';
  nuevoMaterialResultados: PresupuestoItemBuscarDto[] = [];
  nuevoMaterialBuscando = false;
  creandoMaterial = false;
  private nuevoMaterialTimeoutId: ReturnType<typeof setTimeout> | null = null;

  onNuevoMaterialQueryChange(q: string): void {
    this.nuevoMaterialQuery = q;
    if (this.nuevoMaterialTimeoutId) clearTimeout(this.nuevoMaterialTimeoutId);
    if (!q || q.trim().length < 2) {
      this.nuevoMaterialResultados = [];
      return;
    }
    this.nuevoMaterialBuscando = true;
    this.nuevoMaterialTimeoutId = setTimeout(() => {
      this.svc.buscarItemPresupuesto(q.trim()).subscribe({
        next: (res) => {
          this.nuevoMaterialResultados = res;
          this.nuevoMaterialBuscando = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.nuevoMaterialBuscando = false;
          this.cdr.markForCheck();
        },
      });
    }, 300);
  }

  seleccionarNuevoMaterial(item: PresupuestoItemBuscarDto): void {
    if (this.creandoMaterial) return;
    // Si ese ítem de S10 ya está vinculado a un material existente, lo reusa
    // en vez de crear un duplicado.
    const yaExiste = this.materiales.find((m) => m.presupuestoItemId === item.id);
    if (yaExiste) {
      this.form.materialId = yaExiste.id;
      this.nuevoMaterialQuery = '';
      this.nuevoMaterialResultados = [];
      this.cdr.markForCheck();
      return;
    }

    this.creandoMaterial = true;
    this.cdr.markForCheck();
    this.svc
      .createMaterial({ nombre: item.nombre, orden: this.materiales.length + 1, presupuestoItemId: item.id })
      .subscribe({
        next: (m) => {
          this.materiales = [...this.materiales, m].sort((a, b) => a.nombre.localeCompare(b.nombre));
          this.form.materialId = m.id;
          this.nuevoMaterialQuery = '';
          this.nuevoMaterialResultados = [];
          this.creandoMaterial = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.creandoMaterial = false;
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
      materialId: 0,
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
    this.nuevoMaterialQuery = '';
    this.nuevoMaterialResultados = [];
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  abrirEditar(a: ActivoRotativoListDto): void {
    this.editandoId = a.id;
    this.form = {
      materialId: a.materialId,
      codigo: a.codigo,
      estado: a.estado,
      proyectoActualId: a.proyectoActualId,
      responsableNombre: a.responsableNombre,
      responsableTelefono: a.responsableTelefono,
      observaciones: '',
    };
    this.nuevoMaterialQuery = '';
    this.nuevoMaterialResultados = [];
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  cerrarFormModal(): void {
    this.showFormModal = false;
    this.cdr.markForCheck();
  }

  get canSubmitForm(): boolean {
    return !!(this.form.materialId && !this.saving);
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

  // ── Dar de baja (acción rápida en la fila, sin abrir el formulario) ──────
  darDeBaja(a: ActivoRotativoListDto): void {
    if (a.estado === 'baja') return;
    Swal.fire({
      icon: 'warning',
      title: `¿Dar de baja este activo?`,
      html: `<strong>${a.materialNombre}</strong>${a.codigo ? ' — ' + a.codigo : ''}`,
      input: 'text',
      inputPlaceholder: 'Motivo (opcional, ej. no se ubica / perdido)',
      showCancelButton: true,
      confirmButtonText: 'Dar de baja',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const motivo = (result.value as string | undefined)?.trim();
      this.svc
        .updateActivo(a.id, {
          materialId: a.materialId,
          codigo: a.codigo,
          estado: 'baja',
          proyectoActualId: a.proyectoActualId,
          responsableNombre: a.responsableNombre,
          responsableTelefono: a.responsableTelefono,
          observaciones: motivo || undefined,
        })
        .subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Dado de baja', timer: 1500, showConfirmButton: false });
            this.cargarTodo();
          },
          error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
        });
    });
  }

  // ── Eliminar activo por completo (registro de prueba, no decomiso real) ──
  eliminarActivo(a: ActivoRotativoListDto): void {
    Swal.fire({
      icon: 'error',
      title: '¿Eliminar este activo definitivamente?',
      html: `<strong>${a.materialNombre}</strong>${a.codigo ? ' — ' + a.codigo : ''}<br><small>Esta acción no se puede deshacer y no queda como historial (a diferencia de "Dar de baja").</small>`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar definitivamente',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deleteActivo(a.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
          this.cargarTodo();
        },
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
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
