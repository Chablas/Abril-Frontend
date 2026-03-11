import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from "@angular/common";
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  titulo: string = '';
  menuOpen = false;
  proyectosOpen = false;
  proyectosConfiguracionOpen = false;
  seguridadOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      let current = this.route;

      while (current.firstChild) {
        current = current.firstChild;
      }

      this.titulo = current.snapshot.data['titulo'] ?? '';
      this.cdr.detectChanges();
    });
  }

  toggle(menu: 'proyectos' | 'seguridad' | 'proyectosConfiguracion') {
    if (menu === 'proyectos') {
      this.proyectosOpen = !this.proyectosOpen;

      this.seguridadOpen = false;
    }

    if (menu === 'seguridad') {
      this.seguridadOpen = !this.seguridadOpen;

      this.proyectosOpen = false;
      this.proyectosConfiguracionOpen = false;
    }

    if (menu === 'proyectosConfiguracion') {
      this.proyectosConfiguracionOpen = !this.proyectosConfiguracionOpen;
    }
  }
}