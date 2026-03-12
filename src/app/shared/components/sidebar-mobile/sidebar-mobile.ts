import { Component, Input } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar-mobile',
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar-mobile.html',
  styleUrl: './sidebar-mobile.css',
})
export class SidebarMobile {
  proyectosOpen = false;
  proyectosConfiguracionOpen = false;
  seguridadOpen = false;
  @Input() menuOpen: boolean = false;

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
