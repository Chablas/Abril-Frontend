import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchInput } from '../../../../../../../shared/components/search-input/search-input';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { VisibilidadService } from '../../services/visibilidad.service';
import { VisibilidadAmbito, VisibilidadAreaNodeDTO } from '../../dtos/visibilidad.dto';

interface OrderedNode {
  node: VisibilidadAreaNodeDTO;
  depth: number;
}

/**
 * Elige las áreas que un trabajador puede ver.
 *
 * Una sola casilla por área: marcar un área marca también sus subáreas y desmarcarla las
 * desmarca, así que lo que se guarda es exactamente la lista que se ve marcada. Antes había dos
 * columnas ("solo esta área" y "con subáreas") y no se entendía cuál mandaba.
 */
@Component({
  standalone: true,
  selector: 'app-visibilidad-modal',
  imports: [CommonModule, BaseModal, SearchInput],
  templateUrl: './visibilidad-modal.html',
})
export class VisibilidadModal implements OnInit {
  @Input({ required: true }) ambito!: VisibilidadAmbito;
  @Input() workerId!: number;
  @Input() workerName = '';
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

  loaded = false;

  constructor(
    private service: VisibilidadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getAreaTree(this.ambito).subscribe({
      next: (nodes) => {
        this.buildOrdered(nodes);
        this.buildTipos(nodes);
        this.service.getWorkerAsignaciones(this.ambito, this.workerId).subscribe({
          next: (asigs) => {
            this.selection.clear();
            for (const a of asigs) {
              this.selection.add(a.areaScopeId);
              // Compatibilidad con lo cargado antes: una fila "con subáreas" equivalía a tener
              // marcado todo su subárbol, así que se abre acá para que se vea tal cual.
              if (a.incluyeDescendientes) this.marcarSubarbol(a.areaScopeId, true);
            }
            this.loaded = true;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
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
    this.service.updateWorkerAsignaciones(this.ambito, this.workerId, areas).subscribe({
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
