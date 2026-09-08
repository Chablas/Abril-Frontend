import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTab, SectionTabs } from '../../../../shared/components/section-tabs/section-tabs';
import { GaCorreosConfig } from './correos/correos-config';
import { GaDiasReembolsables } from './dias-reembolsables/dias-reembolsables';
import { CorreoPantalla } from './correos/dtos/ga-correo.dto';

/** Lo que cambia de una pantalla a otra. La `pantalla` sale de `route.data`; el resto, de acá. */
interface PantallaDef {
  /** Nombre de la pantalla que se está configurando, para el badge. */
  nombre: string;
  /** Ruta a la que vuelve el botón «Volver». */
  volverA: string;
  /** Una línea sobre qué correos administra: los que se ORIGINAN en esa pantalla. */
  subtitulo: string;
  /** true = además de Correos, la pantalla tiene la sección «Días reembolsables». */
  conPlazo?: boolean;
  /** Aviso para la pantalla que hoy no origina ningún correo. */
  textoSinCorreos?: string;
}

/**
 * Configuración de una pantalla de Gestión Administrativa.
 *
 * Reemplaza a la pantalla única `/gestion-administrativa/configuracion/correos`, donde convivían
 * los once correos del flujo sin decir de dónde salía cada uno. Ahora cada pantalla
 * —Solicitud de Salidas, Mis Rendiciones, Gestión de Salidas, Gestión de Rendiciones y
 * Reembolsos— tiene su botón «Configuración» y administra solo los correos que se originan en
 * ella; los que nacen de la decisión de un revisor (solicitud aprobada/rechazada, primera
 * revisión, reembolso) cuelgan de la pantalla del revisor que los dispara.
 *
 * Es un solo componente para las cinco rutas (mismo patrón que el contenedor de Configuración del
 * módulo): la ruta dice qué pantalla es con `data.pantalla` y el resto sale de
 * <see cref="PANTALLAS"/>. Mis Rendiciones es la única con dos secciones, porque además de sus
 * correos administra el plazo para rendir («Días reembolsables»).
 *
 * El acceso lo restringe la feature 'gestion-administrativa.config.correos' (roleGuard en la
 * ruta), la misma que antes protegía la sección Correos y que sigue habilitando los botones.
 */
@Component({
  standalone: true,
  selector: 'app-ga-pantalla-configuracion',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    GaCorreosConfig,
    GaDiasReembolsables,
  ],
  templateUrl: './pantalla-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaPantallaConfiguracion implements OnInit {
  /** Ids de las secciones exteriores (las de arriba de las subsecciones de cada correo). */
  private static readonly SECCION_CORREOS = 'correos';
  private static readonly SECCION_PLAZO = 'dias-reembolsables';

  private static readonly PANTALLAS: Record<CorreoPantalla, PantallaDef> = {
    'solicitud-salidas': {
      nombre: 'Solicitud de Salidas',
      volverA: '/gestion-administrativa/solicitud-salidas',
      subtitulo: 'Los correos que salen al registrar una solicitud de salida y quién los recibe.',
    },
    rendiciones: {
      nombre: 'Mis Rendiciones',
      volverA: '/gestion-administrativa/rendiciones',
      subtitulo:
        'Los correos que el trabajador dispara sobre su planilla y el plazo que tiene para rendir.',
      conPlazo: true,
    },
    'gestion-salidas': {
      nombre: 'Gestión de Salidas',
      volverA: '/gestion-administrativa/gestion-salidas',
      subtitulo: 'Los correos de la decisión del revisor sobre la solicitud y quién los recibe.',
    },
    'gestion-rendiciones': {
      nombre: 'Gestión de Rendiciones',
      volverA: '/gestion-administrativa/gestion-rendiciones',
      subtitulo:
        'Los correos de las decisiones del revisor sobre la planilla —primera revisión y reembolso— y quién los recibe.',
    },
    reembolsos: {
      nombre: 'Reembolsos',
      volverA: '/gestion-administrativa/reembolsos',
      subtitulo: 'Los correos que se originan en la bandeja de Tesorería y quién los recibe.',
      textoSinCorreos:
        'Reembolsos no envía correos: marcar una planilla como pagada no avisa a nadie.',
    },
  };

  pantalla: CorreoPantalla = 'solicitud-salidas';
  seccionActiva = GaPantallaConfiguracion.SECCION_CORREOS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Las cinco rutas montan este mismo componente, así que la pantalla se lee de la ruta y no
    // del constructor: cambiar de una configuración a otra reusa la instancia.
    this.route.data.subscribe((data) => {
      const pantalla = data['pantalla'] as CorreoPantalla | undefined;
      if (pantalla && GaPantallaConfiguracion.PANTALLAS[pantalla]) this.pantalla = pantalla;

      this.seccionActiva = GaPantallaConfiguracion.SECCION_CORREOS;
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

  /**
   * Secciones exteriores. Con una sola no se dibuja la tira: sería una pestaña que no lleva a
   * ningún otro lado (mismo criterio que las subsecciones de cada correo).
   */
  get secciones(): SectionTab[] {
    if (!this.def.conPlazo) return [];
    return [
      { id: GaPantallaConfiguracion.SECCION_CORREOS, label: 'Correos' },
      { id: GaPantallaConfiguracion.SECCION_PLAZO, label: 'Días reembolsables' },
    ];
  }

  get mostrandoCorreos(): boolean {
    return this.seccionActiva === GaPantallaConfiguracion.SECCION_CORREOS;
  }

  get mostrandoPlazo(): boolean {
    return !!this.def.conPlazo && this.seccionActiva === GaPantallaConfiguracion.SECCION_PLAZO;
  }

  onSeccionChange(id: string): void {
    this.seccionActiva = id;
  }

  volver(): void {
    this.router.navigate([this.def.volverA]);
  }
}
