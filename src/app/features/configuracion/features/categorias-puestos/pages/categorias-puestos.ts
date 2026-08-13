import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
import { CategoriasPuestosService } from '../services/categorias-puestos.service';
import { CategoriaAdminDto, PuestoAdminDto } from '../dtos/categorias-puestos.dto';
import { ConfigCategorias } from '../components/categorias/categorias';
import { ConfigPuestos } from '../components/puestos/puestos';

type CatalogoSection = 'categorias' | 'puestos';

/**
 * Configuración → Categorías y Puestos.
 *
 * Reemplaza al viejo modal "Catálogos" que colgaba de la barra de acciones de
 * Gestión de Ingresos → Trabajadores: son datos maestros de toda la organización, así
 * que viven en el módulo de configuración global como una sección más.
 *
 * El contenedor es dueño de la data (una sola petición trae categorías + puestos, que
 * las dos secciones necesitan de entrada) y conmuta las secciones con
 * `app-section-tabs`, igual que `ga-configuracion` y `costs-configuration`. Cada
 * sección se encarga de sus filtros, su paginación y sus modales.
 */
@Component({
  selector: 'app-configuracion-categorias-puestos',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    FilterTriggerButton,
    ConfigCategorias,
    ConfigPuestos,
  ],
  templateUrl: './categorias-puestos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class CategoriasPuestos implements OnInit {
  readonly tabs = CONFIGURACION_TABS;

  readonly sectionTabs: SectionTab[] = [
    { id: 'categorias', label: 'Categorías' },
    { id: 'puestos', label: 'Puestos' },
  ];
  activeSection: CatalogoSection = 'categorias';

  categorias: CategoriaAdminDto[] = [];
  puestos: PuestoAdminDto[] = [];

  @ViewChild(ConfigCategorias) private categoriasCmp?: ConfigCategorias;
  @ViewChild(ConfigPuestos) private puestosCmp?: ConfigPuestos;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        // Ambas listas representan entidades sin orden propio: se ordenan alfabéticamente
        // acá, al asignarlas, porque ni la tabla ni app-search-select reordenan por su cuenta.
        this.categorias = [...(data.categorias ?? [])].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        );
        this.puestos = [...(data.puestos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get subtitulo(): string {
    return this.activeSection === 'categorias'
      ? 'Categorías del catálogo de trabajadores. La categoría es la que manda sobre los entregables, permisos y filtros internos.'
      : 'Puestos del catálogo de trabajadores. El puesto es el cargo que se muestra en la ficha; cada uno pertenece a una categoría.';
  }

  get botonPrimario(): { label: string; icono: string } {
    return {
      label: this.activeSection === 'categorias' ? 'Nueva categoría' : 'Nuevo puesto',
      icono: 'ti-plus',
    };
  }

  /** Componente de la sección activa (solo una existe a la vez por el *ngIf). */
  private get activeCmp(): ConfigCategorias | ConfigPuestos | undefined {
    return this.activeSection === 'categorias' ? this.categoriasCmp : this.puestosCmp;
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  onSectionChange(id: string): void {
    this.activeSection = id as CatalogoSection;
  }

  /** Abre el modal de creación de la sección activa (botón del header). */
  onCreate(): void {
    this.activeCmp?.openCreate();
  }

  /** Abre el modal de filtros de la sección activa (botón proyectado en el header). */
  onOpenFilters(): void {
    const cmp = this.activeCmp;
    if (cmp) cmp.filtrosAbiertos = true;
  }
}
