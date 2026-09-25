import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { GaLugares } from './lugares/pages/lugares';
import { GaMotivos } from './motivos/pages/motivos';
import { GaTrayectos } from '../trayectos/pages/trayectos';
import { GaCarpetaAdjuntos } from './carpeta-adjuntos/pages/carpeta-adjuntos';
import { GaCapturas } from './capturas/pages/capturas';
import { GaRevisoresAreas } from './revisores-areas/pages/revisores-areas';

import { GESTION_ADMINISTRATIVA_TABS } from '../../shared/gestion-administrativa-tabs';
/** Definición de una sección de configuración de Gestión Administrativa. */
interface ConfigSectionDef {
  id: string;
  label: string;
  route: string;
  /** Feature que hay que tener para ver la sección. */
  featureKey: string;
  subtitulo: string;
  /** Etiqueta del botón de crear del header. Sin valor = la sección no crea registros. */
  createLabel?: string;
}

/**
 * Contenedor de configuración de Gestión Administrativa.
 *
 * Agrupa bajo `/gestion-administrativa/configuracion` las pantallas de
 * configuración propias de salidas (lugares, motivos, trayectos, capturas y
 * carpeta de adjuntos) conmutándolas con el componente
 * `app-section-tabs`, siguiendo el mismo patrón que `costs-configuration` de
 * Costos y Presupuestos.
 *
 * Los correos tampoco viven aquí desde setiembre de 2026: se repartieron entre las
 * pantallas donde se originan (`/gestion-administrativa/<pantalla>/configuracion`, con
 * `GaPantallaConfiguracion`), porque juntos no se sabía qué correo salía de dónde.
 *
 * La firma personal ("Tu firma") tampoco: desde el 2026-09-22 vive en Mi Perfil → Mi Firma,
 * porque es de la persona y no de una funcionalidad de este módulo.
 *
 * Los Revisores de Áreas volvieron acá el 2026-09-25, unificados: juntan lo que estaba repartido
 * en la configuración de Solicitud de Salidas (quién aprueba la salida), de Mis Rendiciones (quién
 * revisa la planilla y firma el consolidado) y de Consolidados (quién consolida), más el jefe que se
 * entera de las salidas del staff. Lo personalizado para UN trabajador se asigna en su ficha
 * (Gestión de Ingresos → Trabajadores).
 * La visibilidad de salidas no vive acá: pasó a Gestión de Salidas → Configuración,
 * que es la bandeja que recorta.
 *
 * Cada sección sigue teniendo su propia ruta
 * (`/gestion-administrativa/configuracion/<seccion>`) con su `featureKey` +
 * `roleGuard`, por lo que el control de acceso por sección y los enlaces del
 * sidebar se mantienen intactos. La sección activa se determina a partir de
 * `route.data.seccion`; las pestañas se filtran por los features a los que el
 * usuario tiene acceso.
 */
@Component({
  selector: 'app-ga-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    FilterTriggerButton,
    GaLugares,
    GaMotivos,
    GaTrayectos,
    GaCarpetaAdjuntos,
    GaCapturas,
    GaRevisoresAreas,
  ],
  templateUrl: './ga-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaConfiguracion implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  /** Todas las secciones de configuración, en orden de visualización. */
  private readonly allSections: ConfigSectionDef[] = [
    {
      id: 'lugares',
      label: 'Lugares',
      route: '/gestion-administrativa/configuracion/lugares',
      featureKey: 'gestion-administrativa.config.lugares',
      subtitulo: 'Lugares de origen y destino disponibles para solicitudes.',
      createLabel: 'Nuevo lugar fijo',
    },
    {
      id: 'motivos',
      label: 'Motivos',
      route: '/gestion-administrativa/configuracion/motivos',
      featureKey: 'gestion-administrativa.config.motivos',
      subtitulo: 'Motivos de salida habilitados para los trabajadores.',
      createLabel: 'Nuevo motivo',
    },
    {
      id: 'trayectos',
      label: 'Trayectos',
      route: '/gestion-administrativa/configuracion/trayectos',
      featureKey: 'gestion-administrativa.config.trayectos',
      subtitulo: 'Trayectos y tarifas de movilidad configurados.',
      createLabel: 'Nuevo trayecto',
    },
    {
      id: 'capturas',
      label: 'Capturas',
      route: '/gestion-administrativa/configuracion/capturas',
      featureKey: 'gestion-administrativa.config.capturas',
      subtitulo:
        'Áreas que deben subir capturas de movilidad para rendir una salida. Por defecto, obligatorias.',
    },
    {
      id: 'revisores-areas',
      label: 'Revisores de Áreas',
      route: '/gestion-administrativa/configuracion/revisores-areas',
      featureKey: 'gestion-administrativa.config.revisores-areas',
      subtitulo: 'Quién aprueba, se entera, revisa, consolida y firma por cada área.',
    },
    {
      id: 'carpeta-adjuntos',
      label: 'Carpeta Adjuntos',
      route: '/gestion-administrativa/configuracion/carpeta-adjuntos',
      featureKey: 'gestion-administrativa.config.carpeta-adjuntos',
      subtitulo:
        'Carpeta de SharePoint/OneDrive donde se guardan los documentos adjuntos de las solicitudes de salida (motivos que requieren documento).',
    },
  ];

  /** Secciones a las que el usuario tiene acceso (las que se muestran como pestañas). */
  visibleSections: ConfigSectionDef[] = [];
  sectionTabs: SectionTab[] = [];
  activeSection: string | null = null;

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(GaLugares) private lugaresCmp?: GaLugares;
  @ViewChild(GaMotivos) private motivosCmp?: GaMotivos;
  @ViewChild(GaTrayectos) private trayectosCmp?: GaTrayectos;
  @ViewChild(GaCarpetaAdjuntos) private carpetaAdjuntosCmp?: GaCarpetaAdjuntos;
  @ViewChild(GaCapturas) private capturasCmp?: GaCapturas;
  @ViewChild(GaRevisoresAreas) private revisoresAreasCmp?: GaRevisoresAreas;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.visibleSections = this.allSections.filter((s) =>
      this.navigationService.isNavEntryAllowed({ featureKey: s.featureKey }),
    );
    this.sectionTabs = this.visibleSections.map((s) => ({ id: s.id, label: s.label }));

    this.route.data.subscribe((data) => {
      const seccion = (data['seccion'] as string | null | undefined) ?? null;

      // Ruta contenedora sin sección concreta: redirigir a la primera permitida.
      if (!seccion) {
        if (this.visibleSections.length) {
          this.router.navigate([this.visibleSections[0].route], { replaceUrl: true });
        } else {
          this.router.navigate(['/']);
        }
        return;
      }

      this.activeSection = seccion;
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

  /** Componente de la sección activa (todos exponen filtrosActivos / filtrosAbiertos). */
  private get activeCmp():
    | GaLugares
    | GaMotivos
    | GaTrayectos
    | GaCarpetaAdjuntos
    | GaCapturas
    | GaRevisoresAreas
    | undefined {
    switch (this.activeSection) {
      case 'lugares': return this.lugaresCmp;
      case 'motivos': return this.motivosCmp;
      case 'trayectos': return this.trayectosCmp;
      case 'carpeta-adjuntos': return this.carpetaAdjuntosCmp;
      case 'capturas': return this.capturasCmp;
      case 'revisores-areas': return this.revisoresAreasCmp;
      default: return undefined;
    }
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  onSectionChange(id: string): void {
    const target = this.visibleSections.find((s) => s.id === id);
    if (target) this.router.navigate([target.route]);
  }

  /** Abre el modal de creación de la sección activa (botón del header). */
  onCreate(): void {
    switch (this.activeSection) {
      case 'lugares': this.lugaresCmp?.openCreate(); break;
      case 'motivos': this.motivosCmp?.openCreate(); break;
      case 'trayectos': this.trayectosCmp?.openCreate(); break;
    }
  }

  /** Abre el modal de filtros de la sección activa (botón proyectado en el header). */
  onOpenFilters(): void {
    const cmp = this.activeCmp;
    if (cmp) cmp.filtrosAbiertos = true;
  }
}
