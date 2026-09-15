import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { AccessPanel } from '../access-panel/access-panel';
import { AccessFeatureDto } from '../../dtos/access.dto';
import { SIN_MODULO, displayName } from '../../utils/feature-display-name';

interface FeatureRow extends AccessFeatureDto {
  /** Nombre legible (el del sidebar); el featureKey queda como texto secundario. */
  label: string;
}

interface FeatureGroup {
  key: string;
  moduleName: string;
  items: FeatureRow[];
}

const KEY_SIN_MODULO = 'sin-modulo';

/**
 * Funcionalidades de un detalle de Seguridad, agrupadas por módulo. Cuando llegan con `viaRoles`
 * (detalle de un usuario) cada fila dice qué roles se la dan, y el buscador también encuentra por rol.
 */
@Component({
  selector: 'app-access-features',
  standalone: true,
  imports: [CommonModule, AccessPanel],
  templateUrl: './access-features.html',
  styleUrl: './access-features.css',
})
export class AccessFeatures implements OnChanges {
  @Input() features: AccessFeatureDto[] = [];
  @Input() titulo = 'Funcionalidades';
  @Input() vacio = 'Ninguna funcionalidad.';
  @Input() cargando = false;

  grupos: FeatureGroup[] = [];
  visibles = 0;
  conVia = false;
  private filas: FeatureRow[] = [];
  private termino = '';

  ngOnChanges(): void {
    this.filas = this.features
      .map((f) => ({ ...f, label: displayName(f.featureKey) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    this.conVia = this.features.some((f) => (f.viaRoles?.length ?? 0) > 0);
    this.filtrar();
  }

  buscar(termino: string): void {
    this.termino = termino;
    this.filtrar();
  }

  trackByGrupo(_: number, g: FeatureGroup): string {
    return g.key;
  }

  trackById(_: number, f: FeatureRow): number {
    return f.featureId;
  }

  private filtrar(): void {
    const termino = this.termino.trim();
    const filas = termino
      ? this.filas.filter((f) => SearchInput.matches(this.textoBuscable(f), termino))
      : this.filas;

    const porModulo = new Map<string, FeatureGroup>();
    for (const f of filas) {
      const key = f.moduleId === null ? KEY_SIN_MODULO : String(f.moduleId);
      let grupo = porModulo.get(key);
      if (!grupo) {
        grupo = { key, moduleName: f.moduleName ?? SIN_MODULO, items: [] };
        porModulo.set(key, grupo);
      }
      grupo.items.push(f);
    }

    // Módulos en orden alfabético y «Sin módulo asignado» siempre al final.
    this.grupos = [...porModulo.values()].sort(
      (a, b) =>
        Number(a.key === KEY_SIN_MODULO) - Number(b.key === KEY_SIN_MODULO) ||
        a.moduleName.localeCompare(b.moduleName, 'es'),
    );
    this.visibles = filas.length;
  }

  private textoBuscable(f: FeatureRow): string {
    return [
      f.label,
      f.featureKey,
      f.moduleName ?? SIN_MODULO,
      ...(f.viaRoles ?? []).map((r) => r.roleDescription),
    ].join(' ');
  }
}
