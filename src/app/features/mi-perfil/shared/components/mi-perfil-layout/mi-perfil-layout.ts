import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { NavigationService } from '../../../../../core/navigation/navigation.service';
import { NavSeccionPerfil } from '../../../../../core/navigation/nav.model';

/**
 * Marco de Mi Perfil: el encabezado con quién es el usuario y la barra lateral con las secciones a
 * las que tiene acceso. Cada sección se pinta en el `router-outlet` con su propia ruta.
 *
 * Las secciones salen de `NavigationService.getSeccionesMiPerfil()`, la misma lista que decide si
 * el menú del nombre ofrece «Mi Perfil»: agregar una sección es una entrada ahí y una ruta en
 * `mi-perfil.routes.ts`.
 */
@Component({
  selector: 'app-mi-perfil-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './mi-perfil-layout.html',
  styleUrl: './mi-perfil-layout.css',
})
export class MiPerfilLayout implements OnInit {
  secciones: NavSeccionPerfil[] = [];

  /** Nombre y puesto del usuario, igual que en el sidebar. */
  subtitulo = '';

  private readonly platformId = inject(PLATFORM_ID);

  constructor(private navigationService: NavigationService) {}

  ngOnInit(): void {
    this.secciones = this.navigationService.getSeccionesMiPerfil();

    if (isPlatformBrowser(this.platformId)) {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.subtitulo = [user?.displayName, user?.jobTitle].filter((x) => !!x).join(' · ');
    }
  }
}
