import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Reclutamiento: los correos del proceso que salen
 * desde la bandeja de GTH (long list al solicitante, formulario al postulante, correcciones del
 * formulario, invitación a entrevista y agradecimiento a quien no continúa) más el aviso de
 * formulario completado, que es el único que GTH recibe en vez de enviar. Reemplaza al modal de
 * dos cajas de texto que colgaba del botón «Configuración».
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma que ya habilitaba ese botón. El contenido lo arma `app-gth-correos-config`,
 * compartido con la configuración de Solicitud de Personal: las pestañas salen de los correos
 * que el backend asocia a este módulo, no de una lista escrita acá.
 */
@Component({
  standalone: true,
  selector: 'app-gth-reclutamiento-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, GthCorreosConfig],
  templateUrl: './reclutamiento-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthReclutamientoConfiguracion {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/gestion-gth/reclutamiento']);
  }
}
