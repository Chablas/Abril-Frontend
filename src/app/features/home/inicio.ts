import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../core/navigation/navigation.service';
import { NavGroup, NavModule } from '../../core/navigation/nav.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  constructor(public navService: NavigationService) {}

  get habilitacionModule(): NavModule | undefined {
    return this.navService.getModules().find((m) => m.key === 'habilitacion');
  }

  get orderedGroups(): NavGroup[] {
    const groups = this.habilitacionModule?.groups ?? [];
    const order = ['Administración', 'Operaciones', 'Gestión'];
    return order
      .map((label) => groups.find((g) => g.label === label))
      .filter((g): g is NavGroup => g !== undefined);
  }

  getPillLabel(module: NavModule): string {
    const overrides: Record<string, string> = {
      habilitacion: 'Gestión de Ingresos',
      ssoma: 'Salud',
    };
    return overrides[module.key] ?? module.label;
  }

  getGroupCols(groupLabel: string): number {
    return groupLabel === 'Gestión' ? 5 : 3;
  }

  getGroupAccent(groupLabel: string): { iconBg: string; iconColor: string; hoverBorder: string } {
    const map: Record<string, { iconBg: string; iconColor: string; hoverBorder: string }> = {
      'Gestión':        { iconBg: '#eef2ff', iconColor: '#4f46e5', hoverBorder: '#c7d2fe' },
      'Operaciones':    { iconBg: '#f0fdf4', iconColor: '#16a34a', hoverBorder: '#bbf7d0' },
      'Administración': { iconBg: '#fff7ed', iconColor: '#ea580c', hoverBorder: '#fed7aa' },
    };
    return map[groupLabel] ?? { iconBg: '#f2f2f2', iconColor: '#6b7280', hoverBorder: '#e0e0e0' };
  }
}
