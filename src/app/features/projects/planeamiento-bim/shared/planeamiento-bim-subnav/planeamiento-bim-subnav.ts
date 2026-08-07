import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface BimSubTab {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-planeamiento-bim-subnav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './planeamiento-bim-subnav.html',
  styleUrl: './planeamiento-bim-subnav.css',
})
export class PlaneamientoBimSubnavComponent {
  readonly subTabs: BimSubTab[] = [
    {
      label: 'Configuración Inicial',
      icon: 'ti ti-settings',
      route: '/projects/planeamiento-bim/configuracion-inicial',
    },
    {
      label: 'Carga Diaria',
      icon: 'ti ti-calendar-stats',
      route: '/projects/planeamiento-bim/carga-diaria',
    },
    {
      label: 'Bloqueos',
      icon: 'ti ti-barrier-block',
      route: '/projects/planeamiento-bim/bloqueos',
    },
  ];
}
