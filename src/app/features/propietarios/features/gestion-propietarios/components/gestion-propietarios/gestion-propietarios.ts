import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { GestionPropietariosService } from '../../services/gestion-propietarios.service';
import { PropietarioForm } from '../propietario-form/propietario-form';
import { PropietarioDocumentos } from '../propietario-documentos/propietario-documentos';
import {
  PropiedadDto,
  PropietarioAcceso,
  PropietarioListItemDto,
  PropietarioProyectoDto,
} from '../../dtos/propietario.dto';

interface EstiloAcceso {
  texto: string;
  bg: string;
  color: string;
  titulo: string;
}

const ACCESO: Record<PropietarioAcceso, EstiloAcceso> = {
  ACTIVO:      { texto: 'Activo',               bg: '#D7FAF4', color: '#009C87', titulo: 'Ya creó su contraseña' },
  PENDIENTE:   { texto: 'Invitación pendiente', bg: '#FEF3C7', color: '#B45309', titulo: 'Todavía no creó su contraseña' },
  DESACTIVADO: { texto: 'Desactivado',          bg: '#FAD5D4', color: '#D30000', titulo: 'Desactivado desde Seguridad → Usuarios' },
  SIN_ROL:     { texto: 'Sin acceso',           bg: '#F3F4F6', color: '#4B5563', titulo: 'No tiene el rol PROPIETARIO' },
  SIN_CUENTA:  { texto: 'Sin cuenta',           bg: '#F3F4F6', color: '#4B5563', titulo: 'No tiene un usuario vigente' },
};

/**
 * Propietarios de inmuebles de Abril y la cuenta con la que entran a la app Convivir Abril. La
 * tabla se pagina en el backend: la carga inicial trae también los proyectos (filtro y
 * formulario) y los filtros piden solo la tabla.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-propietarios',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    PropietarioForm,
    PropietarioDocumentos,
  ],
  templateUrl: './gestion-propietarios.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GestionPropietarios implements OnInit, OnDestroy {
  readonly pageSize = 10;
  readonly botonPrimario = { label: 'Crear propietario', icono: 'ti-plus' };

  proyectos: PropietarioProyectoDto[] = [];
  tabla: PagedResponseDTO<PropietarioListItemDto> = {
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  cargado = false;

  searchText = '';
  projectId: number | null = null;
  filtrosAbiertos = false;

  formAbierto = false;
  /** null = crear. */
  propietarioEditar: PropietarioListItemDto | null = null;
  /** El propietario del modal «Documentos» abierto. */
  documentosDe: PropietarioListItemDto | null = null;

  private readonly busqueda$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private service: GestionPropietariosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // Debounce para no pedir la tabla en cada tecla de la búsqueda.
    this.busqueda$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.cargarPagina(1));

    this.cargarInicio();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.projectId != null ? 1 : 0);
  }

  private cargarInicio(): void {
    this.loaderService.show();
    this.service.getInit(this.pageSize).subscribe({
      next: (res) => {
        this.proyectos = res.proyectos;
        this.tabla = res.propietarios;
        this.cargado = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cargarPagina(page: number): void {
    this.loaderService.show();
    this.service.getPaged(page, this.pageSize, this.searchText, this.projectId).subscribe({
      next: (res) => {
        this.tabla = res;
        this.cargado = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onBusquedaChange(): void {
    this.busqueda$.next();
  }

  onProyectoChange(projectId: number | null): void {
    this.projectId = projectId;
    this.cargarPagina(1);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.projectId = null;
    this.cargarPagina(1);
  }

  abrirCrear(): void {
    this.propietarioEditar = null;
    this.formAbierto = true;
  }

  abrirEditar(propietario: PropietarioListItemDto): void {
    this.propietarioEditar = propietario;
    this.formAbierto = true;
  }

  cerrarForm(): void {
    this.formAbierto = false;
    this.propietarioEditar = null;
  }

  /** Uno nuevo queda primero de la lista: se vuelve a la página 1. */
  onGuardado(esNuevo: boolean): void {
    this.cargarPagina(esNuevo ? 1 : this.tabla.page);
  }

  reenviar(propietario: PropietarioListItemDto): void {
    Swal.fire({
      icon: 'question',
      title: 'Reenviar invitación',
      text: `Le llegará a ${propietario.email}.`,
      showCancelButton: true,
      confirmButtonText: 'Reenviar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;

      this.loaderService.show();
      this.service.reenviarInvitacion(propietario.personId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Invitación enviada', text: `Se envió a ${res.email}.` });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  eliminar(propietario: PropietarioListItemDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar propietario',
      text: 'Pierde el acceso a la app y se dan de baja sus propiedades.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#D30000',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;

      this.loaderService.show();
      this.service.eliminar(propietario.personId).subscribe({
        next: () => {
          this.loaderService.hide();
          // Si era el último de la página, se retrocede una.
          const pagina = this.tabla.data.length === 1 && this.tabla.page > 1 ? this.tabla.page - 1 : this.tabla.page;
          this.cargarPagina(pagina);
          Swal.fire({ icon: 'success', title: 'Propietario eliminado', timer: 1500, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  acceso(propietario: PropietarioListItemDto): EstiloAcceso {
    return ACCESO[propietario.acceso] ?? ACCESO.SIN_CUENTA;
  }

  torreDepartamento(propiedad: PropiedadDto): string {
    return [propiedad.torre ? `Torre ${propiedad.torre}` : null, `Dpto. ${propiedad.departamento}`]
      .filter(Boolean)
      .join(' · ');
  }

  trackByPerson(_: number, propietario: PropietarioListItemDto): number {
    return propietario.personId;
  }
}
