import { AreaNodoDto } from './dtos/categorias-puestos.dto';

/** Nodo del árbol de áreas ya jerarquizado, para el filtro en cascada. */
export interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/**
 * Arma la jerarquía a partir de la lista plana que manda el backend. Mismo algoritmo que usan
 * Gestión de Salidas y Visibilidad de Salidas: se ordena primero por `displayOrder` y luego por
 * nombre, porque el árbol no trae los hijos agrupados.
 */
export function buildAreaTree(nodes: AreaNodoDto[]): AreaCascadeNode[] {
  const byId = new Map<number, AreaCascadeNode>();
  for (const n of nodes) {
    byId.set(n.areaScopeId, { areaScopeId: n.areaScopeId, name: n.areaItemName, children: [] });
  }

  const roots: AreaCascadeNode[] = [];
  const sorted = [...nodes].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName),
  );
  for (const n of sorted) {
    const node = byId.get(n.areaScopeId)!;
    const parent = n.areaScopeParentId != null ? byId.get(n.areaScopeParentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** El nodo y todos sus descendientes: es el alcance real de un filtro por área. */
export function collectScopeIds(node: AreaCascadeNode): number[] {
  const ids = [node.areaScopeId];
  for (const c of node.children) ids.push(...collectScopeIds(c));
  return ids;
}

/** Un nivel de la cascada: los hermanos disponibles en ese nivel y el nodo elegido. */
export interface AreaCascadeLevel {
  options: AreaCascadeNode[];
  /** areaScopeId elegido en este nivel, o null si está vacío. */
  selected: number | null;
}

/**
 * Cascada de desplegables sobre el árbol de áreas: un desplegable por nivel de profundidad, y
 * al elegir un nodo aparece el siguiente con sus hijos. Reemplaza a la lista plana de rutas
 * (`Gerencia de Proyectos › Unidad de Proyectos › Ingeniería BIM` como una opción suelta), que
 * con el árbol actual dejaba decenas de opciones casi idénticas en un solo desplegable.
 *
 * No obliga a llegar a una hoja: lo que se guarda es el nodo MÁS PROFUNDO elegido, así que
 * dejar los niveles de abajo vacíos guarda el área del nivel donde se paró el usuario. Mismo
 * comportamiento que la cascada de áreas de la ficha del trabajador (Gestión de Ingresos).
 */
export class AreaCascade {
  levels: AreaCascadeLevel[] = [];

  /** Hijos por nodo; la clave null son las raíces. */
  private readonly hijosDe = new Map<number | null, AreaCascadeNode[]>();
  private readonly padreDe = new Map<number, number | null>();

  constructor(roots: AreaCascadeNode[] = [], selectedId: number | null = null) {
    this.hijosDe.set(null, roots);
    const walk = (nodes: AreaCascadeNode[], parentId: number | null): void => {
      for (const n of nodes) {
        this.padreDe.set(n.areaScopeId, parentId);
        this.hijosDe.set(n.areaScopeId, n.children);
        walk(n.children, n.areaScopeId);
      }
    };
    walk(roots, null);
    this.reset(selectedId);
  }

  /** Camino raíz → nodo. Vacío si el id ya no existe en el árbol. */
  private camino(selectedId: number | null): number[] {
    if (selectedId == null || !this.padreDe.has(selectedId)) return [];
    const camino: number[] = [];
    const vistos = new Set<number>();
    let actual: number | null = selectedId;
    while (actual != null && !vistos.has(actual)) {
      vistos.add(actual);
      camino.unshift(actual);
      actual = this.padreDe.get(actual) ?? null;
    }
    return camino;
  }

  /**
   * Deja la cascada abierta hasta `selectedId`: un nivel por cada paso del camino, más uno
   * vacío con los hijos del último nodo (si tiene) para poder profundizar.
   */
  reset(selectedId: number | null): void {
    const camino = this.camino(selectedId);
    this.levels = [{ options: this.hijosDe.get(null) ?? [], selected: camino[0] ?? null }];

    for (let i = 0; i < camino.length; i++) {
      const hijos = this.hijosDe.get(camino[i]) ?? [];
      if (!hijos.length) continue;
      this.levels.push({ options: hijos, selected: camino[i + 1] ?? null });
    }
  }

  /**
   * Al elegir un nodo se descartan los niveles más profundos y, si el nodo tiene hijos, se
   * agrega un desplegable vacío para el siguiente nivel (opcional).
   */
  onLevelChange(index: number, value: number | null): void {
    const level = this.levels[index];
    if (!level) return;
    level.selected = value;
    this.levels = this.levels.slice(0, index + 1);
    if (value == null) return;

    const hijos = this.hijosDe.get(value) ?? [];
    if (hijos.length) this.levels.push({ options: hijos, selected: null });
  }

  /** Nodo más profundo elegido: es el valor que se guarda. */
  get selectedId(): number | null {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (this.levels[i].selected != null) return this.levels[i].selected;
    }
    return null;
  }
}
