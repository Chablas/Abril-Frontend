import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../core/navigation/navigation.service';
import { NavGroup, NavModule } from '../../core/navigation/nav.model';
import { AuthService } from '../../core/services/auth.service';
import { GUIA_LECCIONES_APRENDIDAS } from '../../shared/constants/mejora-continua-guia';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  /** Guías en video de Mejora Continua (por ahora solo Lecciones Aprendidas). */
  readonly guiasMejoraContinua = [GUIA_LECCIONES_APRENDIDAS];

  constructor(
    public navService: NavigationService,
    private authService: AuthService,
  ) {}

  /**
   * La sección de guías de Mejora Continua solo es visible para los roles
   * 'ADMINISTRADOR DE MEJORA CONTINUA' y 'USUARIO DE ABRIL'.
   */
  get puedeVerGuiasMejoraContinua(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR DE MEJORA CONTINUA') ||
      this.authService.hasRole('USUARIO DE ABRIL')
    );
  }

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
