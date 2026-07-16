import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { WorkerService } from '../../../../../ssoma/salud-ocupacional/services/worker.service';
import { CatalogosHabService } from '../../../../../habilitacion/services/catalogos-hab.service';
import { AreaScopeService } from '../../../../shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../shared/dtos/areaScope.model';
import {
  DocumentTypeDto,
  EmoPorTrabajadorDto,
  WorkerCategoryDto,
  WorkerDatosBasicosDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';

interface EditModel {
  nombreCompleto: string;
  documentIdentityTypeId: number | null;
  numeroDocumento: string;
  cumpleanos: string; // 'YYYY-MM-DD'
  emailCorporativo: string;
  categoria: string;
  ocupacion: string;
  ocupacionId: number | null;
  puesto: string;
  workerCategoryId: number | null;
}

/** Un nivel del árbol de áreas: opciones (hermanos) y el nodo elegido en ese nivel. */
interface AreaLevel {
  options: AreaScopeTreeDto[];
  selected: number | null; // areaScopeId
}

/**
 * Edición mínima de un trabajador (Configuración → Trabajadores). Por ahora solo
 * permite cambiar nombre completo, tipo y número de documento y cumpleaños; todos
 * viven en la tabla `person`, por eso se usa el endpoint dedicado `datos-basicos`
 * que no toca el resto de campos del worker. También asigna el área del trabajador
 * (workers.area_scope_id) mediante desplegables en cascada sobre la Jerarquía de
 * áreas: se guarda el último nodo seleccionado, sin obligar a llegar a una hoja.
 */
@Component({
  selector: 'app-worker-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './worker-edit-form.html',
  styleUrl: './worker-edit-form.css',
})
export class WorkerEditForm implements OnChanges {
  @Input() open = false;
  @Input() worker: EmoPorTrabajadorDto | null = null;
  @Input() documentTypes: DocumentTypeDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: EditModel = this.empty();
  saving = false;

  categorias: { id: number; nombre: string }[] = [];
  ocupaciones: { id: number; nombre: string }[] = [];

  /** Catálogo workers_category (categoría normalizada usada por Salidas y Lecciones). */
  workerCategories: WorkerCategoryDto[] = [];
  private workerCategoriesLoaded = false;

  /** Desplegables en cascada del árbol de áreas (uno por nivel de la Jerarquía). */
  areaLevels: AreaLevel[] = [];
  private areaTree: AreaScopeTreeDto[] = [];
  private areaTreeLoaded = false;

  constructor(
    private workerService: WorkerService,
    private catalogosHabService: CatalogosHabService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadCatalogos();
      this.loadWorkerCategories();
      this.loadAreaTree();
    }
  }

  private empty(): EditModel {
    return {
      nombreCompleto: '',
      documentIdentityTypeId: null,
      numeroDocumento: '',
      cumpleanos: '',
      emailCorporativo: '',
      categoria: '',
      ocupacion: '',
      ocupacionId: null,
      puesto: '',
      workerCategoryId: null,
    };
  }

  private reset(): void {
    if (!this.worker) {
      this.model = this.empty();
      return;
    }
    this.model = {
      nombreCompleto: this.worker.nombreCompleto ?? '',
      documentIdentityTypeId: this.worker.documentIdentityTypeId ?? null,
      numeroDocumento: this.worker.dni ?? '',
      cumpleanos: (this.worker.cumpleanos ?? '').slice(0, 10),
      emailCorporativo: this.worker.emailCorporativo ?? '',
      categoria: this.worker.categoria ?? '',
      ocupacion: this.worker.ocupacion ?? '',
      ocupacionId: this.worker.ocupacionId ?? null,
      puesto: this.worker.puesto ?? '',
      workerCategoryId: this.worker.workerCategoryId ?? null,
    };
  }

  private loadCatalogos(): void {
    this.catalogosHabService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.catalogosHabService.getOcupaciones().subscribe({
      next: (data) => {
        this.ocupaciones = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /** Carga el catálogo workers_category una sola vez (igual que los tipos de documento). */
  private loadWorkerCategories(): void {
    if (this.workerCategoriesLoaded) return;
    this.workerService.getWorkerCategories().subscribe({
      next: (data) => {
        this.workerCategories = data ?? [];
        this.workerCategoriesLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /** Carga la Jerarquía de áreas una sola vez; luego solo re-inicializa los niveles. */
  private loadAreaTree(): void {
    if (this.areaTreeLoaded) {
      this.initAreaLevels();
      return;
    }
    this.areaScopeService.getTree().subscribe({
      next: (tree) => {
        this.areaTree = tree ?? [];
        this.areaTreeLoaded = true;
        this.initAreaLevels();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * Arma los niveles a partir del area_scope_id actual del trabajador: un desplegable
   * por cada nivel del camino raíz → nodo asignado, más uno vacío con los hijos del
   * último nodo (si tiene) para poder profundizar.
   */
  private initAreaLevels(): void {
    const path = this.worker?.areaScopeId
      ? this.findPath(this.areaTree, this.worker.areaScopeId)
      : null;
    this.areaLevels = [
      {
        options: this.visibleOptions(this.areaTree, path?.[0]?.areaScopeId ?? null),
        selected: path?.[0]?.areaScopeId ?? null,
      },
    ];
    if (!path) return;
    for (let i = 0; i < path.length; i++) {
      const children = path[i].children ?? [];
      if (!children.length) continue;
      const next = path[i + 1] ?? null;
      this.areaLevels.push({
        options: this.visibleOptions(children, next?.areaScopeId ?? null),
        selected: next?.areaScopeId ?? null,
      });
    }
  }

  /** Camino raíz → nodo con el areaScopeId buscado, o null si no existe en el árbol. */
  private findPath(nodes: AreaScopeTreeDto[], targetId: number): AreaScopeTreeDto[] | null {
    for (const node of nodes) {
      if (node.areaScopeId === targetId) return [node];
      const sub = this.findPath(node.children ?? [], targetId);
      if (sub) return [node, ...sub];
    }
    return null;
  }

  /** Oculta nodos inactivos, salvo que sean el valor ya asignado (para no romper el prellenado). */
  private visibleOptions(nodes: AreaScopeTreeDto[], selectedId: number | null): AreaScopeTreeDto[] {
    return (nodes ?? []).filter((n) => n.active || n.areaScopeId === selectedId);
  }

  /**
   * Al elegir un nodo se descartan los niveles más profundos y, si el nodo tiene hijos,
   * se agrega un desplegable vacío para el siguiente nivel (opcional: si no se llena,
   * se guarda el último nodo seleccionado).
   */
  onAreaLevelChange(index: number, value: number | null): void {
    const level = this.areaLevels[index];
    level.selected = value ?? null;
    this.areaLevels = this.areaLevels.slice(0, index + 1);
    if (value == null) return;
    const node = level.options.find((o) => o.areaScopeId === value);
    if (node?.children?.length) {
      this.areaLevels.push({ options: this.visibleOptions(node.children, null), selected: null });
    }
  }

  /** Último nodo seleccionado en la cascada (el que se guarda en workers.area_scope_id). */
  get selectedAreaScopeId(): number | null {
    for (let i = this.areaLevels.length - 1; i >= 0; i--) {
      if (this.areaLevels[i].selected != null) return this.areaLevels[i].selected;
    }
    return null;
  }

  /** Ruta legible de la selección actual (ej. "Gerencia de Proyectos › Unidad de Proyectos"). */
  get areaPathLabel(): string {
    const names: string[] = [];
    for (const level of this.areaLevels) {
      if (level.selected == null) break;
      const node = level.options.find((o) => o.areaScopeId === level.selected);
      if (!node) break;
      names.push(node.areaItemName);
    }
    return names.join(' › ');
  }

  onCategoriaChange(nombre: string): void {
    this.model.categoria = nombre;
    this.syncPuesto();
  }

  onOcupacionChange(nombre: string): void {
    this.model.ocupacion = nombre;
    this.model.ocupacionId = this.ocupaciones.find((o) => o.nombre === nombre)?.id ?? null;
    this.syncPuesto();
  }

  /**
   * Autocompleta el puesto final concatenando categoría y ocupación
   * (ej. "Operario" + "Abogado" → "Operario Abogado"). El campo sigue siendo
   * editable: cualquier cambio posterior en un desplegable lo vuelve a calcular.
   */
  private syncPuesto(): void {
    this.model.puesto = [this.model.categoria, this.model.ocupacion]
      .map((v) => (v ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.model.nombreCompleto?.trim();
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'El nombre completo es obligatorio.' });
      return;
    }

    const payload: WorkerDatosBasicosDto = {
      nombreCompleto: this.model.nombreCompleto.trim(),
      documentIdentityTypeId: this.model.documentIdentityTypeId || null,
      numeroDocumento: this.model.numeroDocumento?.trim() || null,
      cumpleanos: this.model.cumpleanos || null,
      emailCorporativo: this.model.emailCorporativo?.trim() || null,
      categoria: this.model.categoria?.trim() || null,
      ocupacion: this.model.ocupacion?.trim() || null,
      ocupacionId: this.model.ocupacionId ?? null,
      puesto: this.model.puesto?.trim() || null,
      areaScopeId: this.selectedAreaScopeId,
      workerCategoryId: this.model.workerCategoryId ?? null,
    };

    this.saving = true;
    this.loaderService.show();

    this.workerService.updateDatosBasicos(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Trabajador actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
