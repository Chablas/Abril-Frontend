import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { SectionTab, SectionTabs } from '../../../../shared/components/section-tabs/section-tabs';
import { VisibilidadAreas } from '../../../../shared/components/visibilidad-areas/visibilidad-areas';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

type SeccionId = 'correos' | 'visibilidad';

/** Una sección de la configuración, con la feature que hay que tener para verla. */
interface SeccionDef {
  id: SeccionId;
  label: string;
  featureKey: string;
}

/**
 * Configuración de Solicitud de Personal: sus correos y su visibilidad.
 *
 *  • Correos (feature 'gestion-gth.reclutamiento.configuracion', la que ya habilitaba el botón
 *    «Configuración»): lo arma `app-gth-correos-config`, que trae los correos del flujo desde el
 *    backend y los pinta como subsecciones.
 *  • Visibilidad (feature 'gestion-gth.config.visibilidad-solicitud-personal'): qué áreas ve cada
 *    trabajador en la pantalla. Es la misma sección que la de Gestión de Salidas
 *    (`app-visibilidad-areas`) contra el backend de GTH.
 *
 * La ruta se abre con cualquiera de las dos (`featureKeys`) y cada sección se filtra por la suya.
 */
@Component({
  standalone: true,
  selector: 'app-gth-solicitud-personal-configuracion',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    SectionTabs,
    GthCorreosConfig,
    VisibilidadAreas,
  ],
  templateUrl: './solicitud-personal-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthSolicitudPersonalConfiguracion implements OnInit {
  private static readonly SECCIONES: SeccionDef[] = [
    { id: 'correos', label: 'Correos', featureKey: 'gestion-gth.reclutamiento.configuracion' },
    {
      id: 'visibilidad',
      label: 'Visibilidad',
      featureKey: 'gestion-gth.config.visibilidad-solicitud-personal',
    },
  ];

  readonly visibilidadEndpoint = 'api/v1/gestion-gth/solicitud-personal/configuracion/visibilidad';

  /** Secciones a las que el usuario tiene acceso (las que se dibujan como pestañas). */
  secciones: SectionTab[] = [];
  seccionActiva: SeccionId = 'correos';

  // Solo existe mientras la sección está activa (*ngIf).
  @ViewChild(VisibilidadAreas) private visibilidadCmp?: VisibilidadAreas;

  constructor(
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.secciones = GthSolicitudPersonalConfiguracion.SECCIONES
      .filter((s) => this.navigationService.isNavEntryAllowed({ featureKey: s.featureKey }))
      .map((s) => ({ id: s.id, label: s.label }));

    this.seccionActiva = (this.secciones[0]?.id as SeccionId) ?? 'correos';
  }

  get mostrandoCorreos(): boolean {
    return this.seccionActiva === 'correos';
  }

  get mostrandoVisibilidad(): boolean {
    return this.seccionActiva === 'visibilidad';
  }

  // ── Filtros (solo la sección Visibilidad tiene tabla) ──────────────────
  get filtrosActivos(): number {
    return this.visibilidadCmp?.filtrosActivos ?? 0;
  }

  onOpenFilters(): void {
    if (this.visibilidadCmp) this.visibilidadCmp.filtrosAbiertos = true;
  }

  onSeccionChange(id: string): void {
    this.seccionActiva = id as SeccionId;
  }

  volver(): void {
    this.router.navigate(['/gestion-gth/solicitud-personal']);
  }
}
