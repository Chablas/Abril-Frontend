import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { NavigationService } from '../../../core/navigation/navigation.service';
// Categorías y Puestos es la primera funcionalidad de configuración de GTH. Sus componentes,
// DTOs y servicio siguen FÍSICAMENTE bajo `features/configuracion/features/categorias-puestos/`
// (donde nacieron, cuando eran configuración global) hasta que se refactoricen; lógicamente ya
// pertenecen a GTH y solo se consumen desde acá. Mismo caso que Revisores de Áreas, que vive en
// `gestion-administrativa/` y lo usa el módulo de Configuración.
import { CategoriasPuestosService } from '../../configuracion/features/categorias-puestos/services/categorias-puestos.service';
import {
  AreaNodoDto,
  CategoriaAdminDto,
  PuestoAdminDto,
} from '../../configuracion/features/categorias-puestos/dtos/categorias-puestos.dto';
import { ConfigCategorias } from '../../configuracion/features/categorias-puestos/components/categorias/categorias';
import { ConfigPuestos } from '../../configuracion/features/categorias-puestos/components/puestos/puestos';

/** Definición de una sección de configuración de GTH. */
interface ConfigSectionDef {
  id: string;
  label: string;
  featureKey: string;
  subtitulo: string;
  /** Etiqueta del botón de crear del header. Sin valor = la sección no crea registros. */
  createLabel?: string;
}

/**
 * Contenedor de configuración de Gestión GTH.
 *
 * Agrupa bajo `/gestion-gth/configuracion` las pantallas de configuración del módulo,
 * conmutándolas con `app-section-tabs`, siguiendo el mismo patrón que
 * `costs-configuration` de Costos y Presupuestos y `ga-configuracion` de Gestión
 * Administrativa.
 *
 * Hoy la única funcionalidad de configuración es "Categorías y Puestos" (los datos maestros
 * del catálogo de trabajadores), que antes colgaba de Configuración global
 * (`/configuracion/categorias-puestos`). Sus dos secciones comparten un solo featureKey y se
 * conmutan en local, sin cambiar de ruta, para no repetir la petición del catálogo al saltar
 * de pestaña. Cuando entre una segunda funcionalidad de configuración habrá que darle su
 * propia ruta + featureKey y resolver la sección activa desde `route.data.seccion`, como hacen
 * Costos y Gestión Administrativa.
 *
 * El contenedor es dueño de la data (una sola petición trae categorías + puestos, que las dos
 * secciones necesitan de entrada); cada sección se encarga de sus filtros, su paginación y sus
 * modales.
 */
@Component({
  selector: 'app-gth-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    FilterTriggerButton,
    ConfigCategorias,
    ConfigPuestos,
  ],
  templateUrl: './gth-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthConfiguracion implements OnInit {
  /** Todas las secciones de configuración, en orden de visualización. */
  private readonly allSections: ConfigSectionDef[] = [
    {
      id: 'categorias',
      label: 'Categorías',
      featureKey: 'gestion-gth.config.categorias-puestos',
      subtitulo:
        'Categorías del catálogo de trabajadores. La categoría es la que manda sobre los entregables, permisos y filtros internos.',
      createLabel: 'Nueva categoría',
    },
    {
      id: 'puestos',
      label: 'Puestos',
      featureKey: 'gestion-gth.config.categorias-puestos',
      subtitulo:
        'Puestos del catálogo de trabajadores. El puesto es el cargo que se muestra en la ficha; cada uno pertenece a una categoría.',
      createLabel: 'Nuevo puesto',
    },
  ];

  /** Secciones a las que el usuario tiene acceso (las que se muestran como pestañas). */
  visibleSections: ConfigSectionDef[] = [];
  sectionTabs: SectionTab[] = [];
  activeSection: string | null = null;

  categorias: CategoriaAdminDto[] = [];
  puestos: PuestoAdminDto[] = [];
  /** Árbol de áreas (lista plana): lo usa la sección Puestos para su filtro y su modal. */
  areaTree: AreaNodoDto[] = [];

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(ConfigCategorias) private categoriasCmp?: ConfigCategorias;
  @ViewChild(ConfigPuestos) private puestosCmp?: ConfigPuestos;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private navigationService: NavigationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.visibleSections = this.allSections.filter((s) =>
      this.navigationService.isFeatureAllowed(s.featureKey),
    );
    this.sectionTabs = this.visibleSections.map((s) => ({ id: s.id, label: s.label }));
    this.activeSection = this.visibleSections[0]?.id ?? null;

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
        // El árbol se pasa tal cual: la sección Puestos lo jerarquiza y lo ordena a su modo.
        this.areaTree = data.areaTree ?? [];
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

  private get activeDef(): ConfigSectionDef | undefined {
    return this.allSections.find((s) => s.id === this.activeSection);
  }

  get subtitulo(): string {
    return this.activeDef?.subtitulo ?? '';
  }

  /** Botón de crear del header; undefined lo oculta en secciones sin creación. */
  get botonPrimario(): { label: string; icono: string } | undefined {
    const label = this.activeDef?.createLabel;
    return label ? { label, icono: 'ti-plus' } : undefined;
  }

  /** Componente de la sección activa (solo una existe a la vez por el *ngIf). */
  private get activeCmp(): ConfigCategorias | ConfigPuestos | undefined {
    switch (this.activeSection) {
      case 'categorias': return this.categoriasCmp;
      case 'puestos': return this.puestosCmp;
      default: return undefined;
    }
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  onSectionChange(id: string): void {
    this.activeSection = id;
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
