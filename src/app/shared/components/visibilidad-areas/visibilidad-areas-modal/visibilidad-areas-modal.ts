import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../base-modal/base-modal';
import { SearchInput } from '../../search-input/search-input';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { VisibilidadAreasService } from '../visibilidad-areas.service';
import { VisibilidadAreaNodeDTO, VisibilidadObraDTO } from '../visibilidad-areas.dto';

interface OrderedNode {
  node: VisibilidadAreaNodeDTO;
  depth: number;
}

/** `ver` = solo lectura (qué ve hoy); `editar` = elegir qué verá. */
export type VisibilidadModalModo = 'ver' | 'editar';

/**
 * Las áreas que un trabajador puede ver, en los dos sentidos: consultarlas (`ver`) y elegirlas
 * (`editar`). Es un solo componente porque la pregunta se responde con la misma cuadrícula de
 * casillas; lo único que cambia es si se pueden tocar.
 *
 * Una sola casilla por área: marcar un área marca también sus subáreas y desmarcarla las
 * desmarca, así que lo que se guarda es exactamente la lista que se ve marcada. Antes había dos
 * columnas ("solo esta área" y "con subáreas") y no se entendía cuál mandaba.
 *
 * De qué se parte:
 *  • `ver`    → siempre lo VIGENTE, venga de una configuración propia o del algoritmo.
 *  • `editar` → la configuración propia si la hay y, si no, lo que hoy resuelve el algoritmo, para
 *               no abrir en blanco un trabajador que sí está viendo cosas.
 */
@Component({
  standalone: true,
  selector: 'app-visibilidad-areas-modal',
  imports: [CommonModule, BaseModal, SearchInput],
  templateUrl: './visibilidad-areas-modal.html',
})
export class VisibilidadAreasModal implements OnInit {
  /** Ruta del backend de la pantalla, sin `apiUrl` (ver `VisibilidadAreasService`). */
  @Input({ required: true }) endpoint!: string;
  @Input() modo: VisibilidadModalModo = 'editar';
  @Input() workerId!: number;
  @Input() workerName = '';
  /** Árbol de áreas. Lo pasa la sección, que ya lo cargó: no se vuelve a pedir al servidor. */
  @Input() areaTree: VisibilidadAreaNodeDTO[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  ordered: OrderedNode[] = [];
  /** areaScopeId de las áreas marcadas. */
  selection = new Set<number>();
  /** areaScopeId -> hijos directos, para propagar la marca al subárbol. */
  private hijosDe = new Map<number, number[]>();

  /** Tipos de área disponibles (para los filtros). */
  tipos: { id: number; name: string }[] = [];
  /** Filtro por tipo de área activo (vacío = todos). */
  tipoFilter = new Set<number>();
  searchText = '';

  /** true = el trabajador tiene configuración propia; false = lo resuelve el algoritmo. */
  esPersonalizado = false;
  /** true = ve todo sin recorte por área. */
  veTodo = false;
  /**
   * Obras que ve enteras por ser su residente o administrador. No se eligen acá: salen del
   * proyecto y se suman a lo marcado, así que en los dos modos se muestran sin casilla.
   */
  obras: VisibilidadObraDTO[] = [];

  loaded = false;

  constructor(
    private service: VisibilidadAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get soloLectura(): boolean {
    return this.modo === 'ver';
  }

  get titulo(): string {
    const quien = this.workerName || 'Trabajador';
    return this.soloLectura ? `VISIBILIDAD · ${quien}` : `EDITAR VISIBILIDAD · ${quien}`;
  }

  ngOnInit(): void {
    this.buildOrdered(this.areaTree);
    this.buildTipos(this.areaTree);

    this.loaderService.show();
    this.service.getWorkerDetalle(this.endpoint, this.workerId).subscribe({
      next: (detalle) => {
        this.esPersonalizado = detalle.esPersonalizado;
        this.veTodo = detalle.veTodo;
        this.obras = detalle.obras ?? [];
        this.selection.clear();

        // En detalle siempre lo vigente. En edición, lo propio si lo hay; si no, lo que hoy
        // resuelve el algoritmo, que es exactamente lo que el trabajador está viendo.
        if (this.soloLectura || !detalle.esPersonalizado) {
          for (const id of detalle.efectivas ?? []) this.selection.add(id);
        } else {
          for (const a of detalle.asignaciones ?? []) {
            this.selection.add(a.areaScopeId);
            // Compatibilidad con lo cargado antes: una fila "con subáreas" equivalía a tener
            // marcado todo su subárbol, así que se abre acá para que se vea tal cual.
            if (a.incluyeDescendientes) this.marcarSubarbol(a.areaScopeId, true);
          }
        }

        this.loaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private buildOrdered(nodes: VisibilidadAreaNodeDTO[]): void {
    const byParent = new Map<number | null, VisibilidadAreaNodeDTO[]>();
    for (const n of nodes) {
      const key = n.areaScopeParentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(n);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName));
    }

    this.hijosDe = new Map();
    for (const [parent, hijos] of byParent.entries()) {
      if (parent != null) this.hijosDe.set(parent, hijos.map((h) => h.areaScopeId));
    }

    const result: OrderedNode[] = [];
    const dfs = (parentKey: number | null, depth: number) => {
      const children = byParent.get(parentKey) ?? [];
      for (const child of children) {
        result.push({ node: child, depth });
        dfs(child.areaScopeId, depth + 1);
      }
    };
    dfs(null, 0);
    this.ordered = result;
  }

  private buildTipos(nodes: VisibilidadAreaNodeDTO[]): void {
    const seen = new Map<number, string>();
    for (const n of nodes) if (!seen.has(n.areaTypeId)) seen.set(n.areaTypeId, n.areaTypeName);
    this.tipos = [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id - b.id);
  }

  // ── Filtros ────────────────────────────────────────────────────────
  toggleTipo(id: number): void {
    if (this.tipoFilter.has(id)) this.tipoFilter.delete(id);
    else this.tipoFilter.add(id);
  }

  get filtrando(): boolean {
    return this.tipoFilter.size > 0 || !!this.searchText.trim();
  }

  get filtered(): OrderedNode[] {
    const q = this.searchText.trim();
    return this.ordered.filter((o) => {
      const okTipo = this.tipoFilter.size === 0 || this.tipoFilter.has(o.node.areaTypeId);
      const okText = !q || SearchInput.matches(o.node.areaItemName, q);
      return okTipo && okText;
    });
  }

  /** Cuando hay filtro/búsqueda la jerarquía se rompe → mostrar plano (sin sangría). */
  displayDepth(o: OrderedNode): number {
    return this.filtrando ? 0 : o.depth;
  }

  // ── Selección ──────────────────────────────────────────────────────
  isSelected(id: number): boolean {
    return this.selection.has(id);
  }

  /**
   * Marcar/desmarcar un área arrastra a todas sus subáreas: quien ve una gerencia ve lo que
   * cuelga de ella, y tenerlo que marcar área por área era el trabajo que hacía ilegible el modal.
   */
  toggle(id: number): void {
    if (this.soloLectura) return;
    const marcar = !this.selection.has(id);
    if (marcar) this.selection.add(id);
    else this.selection.delete(id);
    this.marcarSubarbol(id, marcar);
  }

  private marcarSubarbol(id: number, marcar: boolean): void {
    for (const hijo of this.hijosDe.get(id) ?? []) {
      if (marcar) this.selection.add(hijo);
      else this.selection.delete(hijo);
      this.marcarSubarbol(hijo, marcar);
    }
  }

  /** Selecciona todas las áreas visibles según los filtros (con sus subáreas). */
  seleccionarVisibles(): void {
    for (const o of this.filtered) {
      this.selection.add(o.node.areaScopeId);
      this.marcarSubarbol(o.node.areaScopeId, true);
    }
  }

  limpiar(): void {
    this.selection.clear();
  }

  get seleccionadas(): number {
    return this.selection.size;
  }

  save(): void {
    // Siempre sin `incluyeDescendientes`: el subárbol ya va marcado área por área.
    const areas = [...this.selection].map((areaScopeId) => ({
      areaScopeId,
      incluyeDescendientes: false,
    }));

    this.loaderService.show();
    this.service.updateWorkerAsignaciones(this.endpoint, this.workerId, areas).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
