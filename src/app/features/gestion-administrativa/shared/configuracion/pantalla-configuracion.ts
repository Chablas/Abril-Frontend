import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { SectionTab, SectionTabs } from '../../../../shared/components/section-tabs/section-tabs';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { GaCorreosConfig } from './correos/correos-config';
import { GaDiasReembolsables } from './dias-reembolsables/dias-reembolsables';
import { VisibilidadAreas } from '../../../../shared/components/visibilidad-areas/visibilidad-areas';
import { GaAsignacionesAreas } from './asignaciones-areas/asignaciones-areas';
import { AsignacionAreaModo } from './asignaciones-areas/dtos/asignacion-area.dto';
import { GaFirmas } from './firmas/firmas';
import { CorreoPantalla } from './correos/dtos/ga-correo.dto';

/**
 * Ámbito de la sección Visibilidad: el segmento del backend
 * (`api/v1/gestion-administrativa/configuracion/visibilidad/{ambito}`) que dice sobre qué pantalla
 * aplica lo que se guarda. Las tres conviven en la misma tabla sin pisarse.
 *  • `salidas`      → qué solicitudes de salida ve el trabajador en Gestión de Salidas.
 *  • `rendiciones`  → qué planillas ve en Gestión de Rendiciones.
 *  • `consolidados` → qué Consolidados del S10 ve en Consolidados.
 */
type VisibilidadAmbito = 'salidas' | 'rendiciones' | 'consolidados';

/** Ids de las secciones exteriores (las de arriba de las subsecciones de cada correo). */
type SeccionId =
  | 'correos'
  | 'dias-reembolsables'
  | 'recordatorios'
  | 'visibilidad'
  | 'revisores'
  | 'consolidadores'
  | 'firmas';

/** Una sección de la configuración de una pantalla. */
interface SeccionDef {
  id: SeccionId;
  label: string;
  /** Feature que hay que tener para verla. Sin valor, la sección no se filtra. */
  featureKey?: string;
}

/** Lo que cambia de una pantalla a otra. La `pantalla` sale de `route.data`; el resto, de acá. */
interface PantallaDef {
  /** Nombre de la pantalla que se está configurando, para el badge. */
  nombre: string;
  /** Ruta a la que vuelve el botón «Volver». */
  volverA: string;
  /** Una línea sobre qué administra esta configuración. */
  subtitulo: string;
  /** Secciones de la pantalla, en orden. Correos va primero en todas. */
  secciones: SeccionDef[];
  /** Aviso para la pantalla que hoy no origina ningún correo. */
  textoSinCorreos?: string;
  /** Ámbito de la sección Visibilidad (solo en las pantallas que la tienen). */
  visibilidadAmbito?: VisibilidadAmbito;
}

/**
 * Configuración de una pantalla de Gestión Administrativa.
 *
 * Cada pantalla del flujo administra lo que se ORIGINA en ella: sus correos y lo que solo tiene
 * sentido ahí. Reemplaza a la pantalla única `/gestion-administrativa/configuracion/correos`, donde
 * convivían los once correos del flujo sin decir de dónde salía cada uno.
 *
 * Es un solo componente para todas esas rutas (mismo patrón que el contenedor de Configuración del
 * módulo): la ruta dice qué pantalla es con `data.pantalla` y el resto sale de `PANTALLAS`.
 *
 * Dónde vive cada sección y por qué:
 *  • Solicitud de Salidas: sus correos, el plazo para rendir («Días reembolsables»), los dos
 *    recordatorios de ese plazo y los REVISORES de cada área — el revisor es a quien se le manda la
 *    solicitud que nace acá.
 *  • Gestión de Salidas: los correos de la decisión del revisor y la VISIBILIDAD de esa bandeja.
 *  • Gestión de Rendiciones: los correos de la primera revisión y la VISIBILIDAD de esa bandeja
 *    (independiente de la de salidas).
 *  • Consolidados: los correos de la decisión del reembolso y de los trámites del consolidador
 *    (avisar a la jefatura, pedir la corrección al ERP), la VISIBILIDAD de esa bandeja, los
 *    CONSOLIDADORES, que es quién adjunta el Consolidado del S10 de los trabajadores de cada área,
 *    y las FIRMAS, o sea cómo registra su firma quien aprueba acá.
 *
 * El acceso a la pantalla lo abre cualquiera de los featureKeys de sus secciones (`featureKeys` en
 * la ruta) y cada sección se filtra además por el suyo.
 */
@Component({
  standalone: true,
  selector: 'app-ga-pantalla-configuracion',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    SectionTabs,
    GaCorreosConfig,
    GaDiasReembolsables,
    VisibilidadAreas,
    GaAsignacionesAreas,
    GaFirmas,
  ],
  templateUrl: './pantalla-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaPantallaConfiguracion implements OnInit {
  /** Features de las secciones que no son "Correos". */
  private static readonly FEATURE_VISIBILIDAD_SALIDAS = 'gestion-administrativa.config.visibilidad-salidas';
  private static readonly FEATURE_VISIBILIDAD_RENDICIONES = 'gestion-administrativa.config.visibilidad-rendiciones';
  private static readonly FEATURE_VISIBILIDAD_CONSOLIDADOS = 'gestion-administrativa.config.visibilidad-consolidados';
  private static readonly FEATURE_CONSOLIDADORES = 'gestion-administrativa.config.consolidadores-areas';
  private static readonly FEATURE_FIRMAS = 'gestion-administrativa.config.firmas';
  /** Los revisores de áreas conservan su feature de cuando vivían en Configuración global. */
  private static readonly FEATURE_REVISORES = 'configuracion.revisores-areas';
  /** La feature que ya protegía la sección Correos: quien administra un correo los administra todos. */
  private static readonly FEATURE_CORREOS = 'gestion-administrativa.config.correos';

  private static readonly SECCION_CORREOS: SeccionDef = {
    id: 'correos',
    label: 'Correos',
    featureKey: GaPantallaConfiguracion.FEATURE_CORREOS,
  };

  private static readonly PANTALLAS: Record<CorreoPantalla, PantallaDef> = {
    'solicitud-salidas': {
      nombre: 'Solicitud de Salidas',
      volverA: '/gestion-administrativa/solicitud-salidas',
      subtitulo: 'Correos, plazo para rendir, recordatorios y revisores por área.',
      secciones: [
        GaPantallaConfiguracion.SECCION_CORREOS,
        // El plazo y sus dos recordatorios se administran con los correos: los recordatorios
        // SON correos (los dispara el calendario) y el plazo es de lo que avisan.
        {
          id: 'dias-reembolsables',
          label: 'Días reembolsables',
          featureKey: GaPantallaConfiguracion.FEATURE_CORREOS,
        },
        {
          id: 'recordatorios',
          label: 'Recordatorios',
          featureKey: GaPantallaConfiguracion.FEATURE_CORREOS,
        },
        {
          id: 'revisores',
          label: 'Revisores de Áreas',
          featureKey: GaPantallaConfiguracion.FEATURE_REVISORES,
        },
      ],
    },
    rendiciones: {
      nombre: 'Mis Rendiciones',
      volverA: '/gestion-administrativa/rendiciones',
      subtitulo: 'Los correos que el trabajador dispara sobre su planilla.',
      secciones: [GaPantallaConfiguracion.SECCION_CORREOS],
    },
    'gestion-salidas': {
      nombre: 'Gestión de Salidas',
      volverA: '/gestion-administrativa/gestion-salidas',
      subtitulo: 'Correos de la decisión del revisor y visibilidad de la bandeja.',
      secciones: [
        GaPantallaConfiguracion.SECCION_CORREOS,
        {
          id: 'visibilidad',
          label: 'Visibilidad',
          featureKey: GaPantallaConfiguracion.FEATURE_VISIBILIDAD_SALIDAS,
        },
      ],
      visibilidadAmbito: 'salidas',
    },
    'gestion-rendiciones': {
      nombre: 'Gestión de Rendiciones',
      volverA: '/gestion-administrativa/gestion-rendiciones',
      subtitulo: 'Correos de la primera revisión y visibilidad de la bandeja.',
      secciones: [
        GaPantallaConfiguracion.SECCION_CORREOS,
        {
          id: 'visibilidad',
          label: 'Visibilidad',
          featureKey: GaPantallaConfiguracion.FEATURE_VISIBILIDAD_RENDICIONES,
        },
      ],
      visibilidadAmbito: 'rendiciones',
    },
    consolidados: {
      nombre: 'Consolidados',
      volverA: '/gestion-administrativa/consolidados',
      subtitulo:
        'Correos del reembolso y del consolidador, visibilidad de la bandeja, consolidadores por área y cómo se registra la firma.',
      secciones: [
        GaPantallaConfiguracion.SECCION_CORREOS,
        {
          id: 'visibilidad',
          label: 'Visibilidad',
          featureKey: GaPantallaConfiguracion.FEATURE_VISIBILIDAD_CONSOLIDADOS,
        },
        // Los Consolidadores viven acá y no en Gestión de Rendiciones: lo que administran es
        // quién adjunta el documento que esta pantalla muestra y firma, y quién sigue su trámite.
        {
          id: 'consolidadores',
          label: 'Consolidadores',
          featureKey: GaPantallaConfiguracion.FEATURE_CONSOLIDADORES,
        },
        // Las Firmas viven acá porque es acá donde se firma: aprobar un consolidado ES estampar la
        // firma, y lo que se marca decide qué se le exige registrar a quien aprueba. Contabilidad
        // y "Tu firma" no lo miran: allá se sigue registrando solo la dibujada.
        {
          id: 'firmas',
          label: 'Firmas',
          featureKey: GaPantallaConfiguracion.FEATURE_FIRMAS,
        },
      ],
      visibilidadAmbito: 'consolidados',
    },
    reembolsos: {
      nombre: 'Reembolsos',
      volverA: '/gestion-administrativa/reembolsos',
      subtitulo: 'Los correos que se originan en la bandeja de Tesorería.',
      secciones: [GaPantallaConfiguracion.SECCION_CORREOS],
      textoSinCorreos:
        'Reembolsos no envía correos: marcar una planilla como pagada no avisa a nadie.',
    },
    'correcciones-s10': {
      nombre: 'Correcciones S10',
      volverA: '/gestion-administrativa/correcciones-s10',
      subtitulo: 'El correo que el Coordinador ERP dispara al atender una corrección.',
      secciones: [GaPantallaConfiguracion.SECCION_CORREOS],
    },
  };

  pantalla: CorreoPantalla = 'solicitud-salidas';
  seccionActiva: SeccionId = 'correos';
  /** Secciones a las que el usuario tiene acceso (las que se dibujan como pestañas). */
  secciones: SectionTab[] = [];

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(VisibilidadAreas) private visibilidadCmp?: VisibilidadAreas;
  @ViewChild(GaAsignacionesAreas) private asignacionesCmp?: GaAsignacionesAreas;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    // Las rutas montan este mismo componente, así que la pantalla se lee de la ruta y no del
    // constructor: cambiar de una configuración a otra reusa la instancia.
    this.route.data.subscribe((data) => {
      const pantalla = data['pantalla'] as CorreoPantalla | undefined;
      if (pantalla && GaPantallaConfiguracion.PANTALLAS[pantalla]) this.pantalla = pantalla;

      this.secciones = this.def.secciones
        .filter((s) => this.navigationService.isNavEntryAllowed({ featureKey: s.featureKey }))
        .map((s) => ({ id: s.id, label: s.label }));

      this.seccionActiva = (this.secciones[0]?.id as SeccionId) ?? 'correos';
    });
  }

  private get def(): PantallaDef {
    return GaPantallaConfiguracion.PANTALLAS[this.pantalla];
  }

  get badge(): string {
    return `GESTIÓN ADMINISTRATIVA · ${this.def.nombre.toUpperCase()}`;
  }

  get subtitulo(): string {
    return this.def.subtitulo;
  }

  get textoSinCorreos(): string {
    return this.def.textoSinCorreos ?? 'Esta pantalla no origina correos.';
  }

  /** Backend de la sección Visibilidad de esta pantalla (la sección es compartida). */
  get visibilidadEndpoint(): string {
    return `api/v1/gestion-administrativa/configuracion/visibilidad/${this.def.visibilidadAmbito ?? 'salidas'}`;
  }

  /** Modo de la sección de asignaciones por área que está activa. */
  get asignacionModo(): AsignacionAreaModo {
    return this.seccionActiva === 'consolidadores' ? 'consolidadores' : 'revisores';
  }

  get mostrandoCorreos(): boolean {
    return this.seccionActiva === 'correos';
  }

  get mostrandoPlazo(): boolean {
    return this.seccionActiva === 'dias-reembolsables';
  }

  get mostrandoRecordatorios(): boolean {
    return this.seccionActiva === 'recordatorios';
  }

  get mostrandoVisibilidad(): boolean {
    return this.seccionActiva === 'visibilidad';
  }

  get mostrandoAsignaciones(): boolean {
    return this.seccionActiva === 'revisores' || this.seccionActiva === 'consolidadores';
  }

  get mostrandoFirmas(): boolean {
    return this.seccionActiva === 'firmas';
  }

  // ── Filtros de la sección activa ────────────────────────────────────────
  // Solo las secciones con tabla los tienen; en el resto el botón no se dibuja.

  private get cmpConFiltros(): VisibilidadAreas | GaAsignacionesAreas | undefined {
    if (this.mostrandoVisibilidad) return this.visibilidadCmp;
    if (this.mostrandoAsignaciones) return this.asignacionesCmp;
    return undefined;
  }

  get seccionConFiltros(): boolean {
    return this.mostrandoVisibilidad || this.mostrandoAsignaciones;
  }

  get filtrosActivos(): number {
    return this.cmpConFiltros?.filtrosActivos ?? 0;
  }

  onOpenFilters(): void {
    const cmp = this.cmpConFiltros;
    if (cmp) cmp.filtrosAbiertos = true;
  }

  onSeccionChange(id: string): void {
    this.seccionActiva = id as SeccionId;
  }

  volver(): void {
    this.router.navigate([this.def.volverA]);
  }
}
