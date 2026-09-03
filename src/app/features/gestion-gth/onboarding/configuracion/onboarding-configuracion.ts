import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Onboarding: hoy, el aviso al coordinador
 * administrativo de la obra donde entra el colaborador.
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma de las otras tres configuraciones del módulo: quien administra los correos de
 * Gestión GTH los administra todos. El contenido lo arma `app-gth-correos-config`, y sus pestañas
 * salen de los correos que el backend asocia a este módulo, no de una lista escrita acá.
 */
@Component({
  standalone: true,
  selector: 'app-gth-onboarding-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, GthCorreosConfig],
  templateUrl: './onboarding-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthOnboardingConfiguracion {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/gestion-gth/onboarding']);
  }
}
