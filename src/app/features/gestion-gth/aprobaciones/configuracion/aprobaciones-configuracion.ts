import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Aprobaciones: el aviso que sale a GTH cuando
 * Gerencia aprueba una solicitud de personal. Vivía en la configuración de Solicitud de Personal,
 * pero ese correo no lo dispara el solicitante sino la decisión que se toma en esta pantalla.
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma que habilita las otras dos configuraciones de correos de Gestión GTH: quien
 * administra los correos del módulo los administra todos. El contenido lo arma
 * `app-gth-correos-config`, compartido con esas dos pantallas: las secciones salen de los correos
 * que el backend asocia a este módulo, no de una lista escrita acá.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobaciones-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, GthCorreosConfig],
  templateUrl: './aprobaciones-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthAprobacionesConfiguracion {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/gestion-gth/aprobaciones']);
  }
}
