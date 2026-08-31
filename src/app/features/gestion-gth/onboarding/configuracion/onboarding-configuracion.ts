import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Onboarding: la ida y la vuelta de la carta oferta.
 * La ida es el correo que recibe el colaborador con el enlace para leerla, registrar su firma y
 * firmarla en línea (sale tanto al abrir el onboarding como al reenviar el enlace desde el
 * detalle, con el mismo cuerpo); la vuelta es el aviso a GTH de que ya la firmó, que dispara él
 * mismo desde ese enlace.
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma que habilita las otras tres configuraciones de correos de Gestión GTH: quien
 * administra los correos del módulo los administra todos. El contenido lo arma
 * `app-gth-correos-config`, compartido con esas pantallas: las secciones salen de los correos que
 * el backend asocia a este módulo, no de una lista escrita acá.
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
