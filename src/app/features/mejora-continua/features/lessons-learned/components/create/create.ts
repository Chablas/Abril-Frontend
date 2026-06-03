import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../../shared/components/image-preview/image-preview';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LeccionesAprendidasService } from '../../services/lecciones-aprendidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LessonFiltersDTO } from '../../dtos/lessonFilters.model';
import { ScopeItemDTO } from '../../dtos/scope-item.model';
import { LessonAreaConfigItemDto } from '../../../configuration/lesson-areas/dtos/lesson-area.dto';
import Swal from 'sweetalert2';

/**
 * Nodo del árbol de áreas para el selector en cascada.
 * Se reconstruye en el front a partir de los `path` de cada rama (hoja) devuelta
 * por el backend. Solo las hojas llevan `lessonAreaId`.
 */
interface AreaTreeNode {
  id: number; // id sintético estable para el search-select
  name: string;
  typeName: string;
  lessonAreaId?: number;
  children: AreaTreeNode[];
}

@Component({
  selector: 'app-create-lesson',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, FileSelector, ImagePreview, SearchSelect],
  templateUrl: './create.html',
})
export class CreateLesson implements OnInit {
  @Input() filtersData!: LessonFiltersDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Ubicación
  projectId: number = 0;
  lessonAreaId: number = 0;

  // Selector de área en cascada (un desplegable por nivel del árbol).
  // areaLevels[i] = opciones del nivel i; selectedAreaNodes[i] = nodo elegido en ese nivel.
  areaLevels: AreaTreeNode[][] = [];
  selectedAreaNodes: (AreaTreeNode | undefined)[] = [];
  private areaNodeSeq = 0;

  // Árbol de scope genérico
  // Cada índice representa un nivel: levels[0] = primer nivel, etc.
  scopeLevels: ScopeItemDTO[][] = [];
  selectedScopeItems: (ScopeItemDTO | undefined)[] = [];

  // Text fields
  problemDescription = '';
  reasonDescription = '';
  lessonDescription = '';
  impactDescription = '';

  // Images
  opportunityPreviews: string[] = [];
  opportunityFiles: File[] = [];
  improvementPreviews: string[] = [];
  improvementFiles: File[] = [];

  constructor(
    private lessonService: LeccionesAprendidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadLessonAreas();
  }

  // ── Helpers de árbol ────────────────────────────────────────────────────────

  getLevelLabel(levelIndex: number): string {
    return this.scopeLevels[levelIndex]?.[0]?.catalogTypeName ?? `Nivel ${levelIndex + 1}`;
  }

  onScopeItemChange(levelIndex: number, selectedId: number | undefined): void {
    const selected = selectedId
      ? this.scopeLevels[levelIndex]?.find((i) => i.scopeItemId === selectedId)
      : undefined;

    this.selectedScopeItems[levelIndex] = selected;

    // Limpiar niveles inferiores
    this.scopeLevels = this.scopeLevels.slice(0, levelIndex + 1);
    this.selectedScopeItems = this.selectedScopeItems.slice(0, levelIndex + 1);

    // Agregar siguiente nivel si hay hijos
    if (selected?.children?.length) {
      this.scopeLevels.push(selected.children);
      this.selectedScopeItems.push(undefined);
    }
  }

  /** CatalogItemId del ítem más profundo seleccionado */
  get deepestSelectedCatalogItemId(): number | undefined {
    for (let i = this.selectedScopeItems.length - 1; i >= 0; i--) {
      if (this.selectedScopeItems[i]) return this.selectedScopeItems[i]!.catalogItemId;
    }
    return undefined;
  }

  /**
   * Valida que la sección CLASIFICACION está completa:
   *   • Existe al menos un nivel.
   *   • Todos los niveles desplegados tienen valor seleccionado.
   *   • El ítem más profundo seleccionado es una HOJA (no tiene hijos).
   * Esto garantiza que se eligió una "relación válida" del árbol de scope —
   * sin esto, el catalog_item enviado podría apuntar a un nodo intermedio
   * que no representa una clasificación completa.
   */
  isClassificationComplete(): boolean {
    if (this.scopeLevels.length === 0) return false;
    if (this.selectedScopeItems.length !== this.scopeLevels.length) return false;
    for (const sel of this.selectedScopeItems) {
      if (!sel) return false;
    }
    const deepest = this.selectedScopeItems[this.selectedScopeItems.length - 1];
    if (!deepest) return false;
    // Si el nodo elegido todavía tiene hijos, el usuario no terminó de profundizar.
    if (deepest.children && deepest.children.length > 0) return false;
    return true;
  }

  // ── Carga de datos ───────────────────────────────────────────────────────────

  private loadLessonAreas(): void {
    this.loaderService.show();
    this.lessonService.getLessonAreasWithScope().subscribe({
      next: (data: LessonAreaConfigItemDto[]) => {
        const roots = this.buildAreaTree(data.filter((d) => d.lessonAreaId != null));
        this.areaLevels = roots.length ? [roots] : [];
        this.selectedAreaNodes = roots.length ? [undefined] : [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Reconstruye el árbol de áreas a partir de los `path` de cada rama (hoja).
   * Omite los nodos raíz cuyo tipo es 'Área de Gerencia' (el "nodo padre de todos"),
   * de modo que el primer nivel arranque en el 'Área Estándar'. Si el primer nodo
   * ya es 'Área Estándar', no se omite nada.
   */
  private buildAreaTree(items: LessonAreaConfigItemDto[]): AreaTreeNode[] {
    this.areaNodeSeq = 0;
    const roots: AreaTreeNode[] = [];

    for (const item of items) {
      // Quitar los segmentos raíz de tipo 'Área de Gerencia'.
      let start = 0;
      while (start < item.path.length && (item.path[start].areaTypeName ?? '').trim() === 'Área de Gerencia') {
        start++;
      }
      const trimmed = item.path.slice(start);
      if (trimmed.length === 0) continue;

      let level = roots;
      let node: AreaTreeNode | undefined;
      for (const seg of trimmed) {
        node = level.find((n) => n.name === seg.areaItemName && n.typeName === seg.areaTypeName);
        if (!node) {
          node = { id: ++this.areaNodeSeq, name: seg.areaItemName, typeName: seg.areaTypeName, children: [] };
          level.push(node);
        }
        level = node.children;
      }
      // El último segmento es la hoja: lleva el lessonAreaId.
      if (node) node.lessonAreaId = item.lessonAreaId!;
    }

    return roots;
  }

  /** Etiqueta de cada desplegable de área: el tipo de área de ese nivel. */
  getAreaLevelLabel(levelIndex: number): string {
    return this.areaLevels[levelIndex]?.[0]?.typeName ?? 'Área';
  }

  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected = selectedId
      ? this.areaLevels[levelIndex]?.find((n) => n.id === selectedId)
      : undefined;

    this.selectedAreaNodes[levelIndex] = selected;

    // Limpiar niveles inferiores
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    // Si el nodo elegido tiene hijos, mostrar el siguiente desplegable
    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }

    this.syncLessonAreaFromCascade();
  }

  /**
   * Calcula el lessonAreaId según el cascade: solo es válido cuando el nodo más
   * profundo seleccionado es una HOJA (sin hijos, con lessonAreaId). Mientras se
   * navega por nodos intermedios, lessonAreaId queda en 0 y se limpia la clasificación.
   */
  private syncLessonAreaFromCascade(): void {
    const deepest = this.selectedAreaNodes.length
      ? this.selectedAreaNodes[this.selectedAreaNodes.length - 1]
      : undefined;
    const newId =
      deepest && !deepest.children.length && deepest.lessonAreaId ? deepest.lessonAreaId : 0;

    if (newId === this.lessonAreaId) return;

    this.lessonAreaId = newId;
    this.scopeLevels = [];
    this.selectedScopeItems = [];
    if (newId) this.loadScopeData();
  }

  private loadScopeData(): void {
    if (!this.lessonAreaId) return;
    this.loaderService.show();
    this.lessonService.getFiltersCreate(this.lessonAreaId).subscribe({
      next: (tree) => {
        this.scopeLevels = tree?.length ? [tree] : [];
        this.selectedScopeItems = tree?.length ? [undefined] : [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Imágenes ─────────────────────────────────────────────────────────────────

  onFileSelected(image: SelectedFile, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.push(image.file);
      this.opportunityPreviews.push(image.preview);
    } else {
      this.improvementFiles.push(image.file);
      this.improvementPreviews.push(image.preview);
    }
  }

  removeImage(index: number, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.splice(index, 1);
      this.opportunityPreviews.splice(index, 1);
    } else {
      this.improvementFiles.splice(index, 1);
      this.improvementPreviews.splice(index, 1);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  submit(): void {
    if (!this.projectId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar proyecto' }); return; }
    if (!this.lessonAreaId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar área' }); return; }
    if (!this.isClassificationComplete()) {
      Swal.fire({
        icon: 'error',
        title: 'Clasificación incompleta',
        text: 'Debes seleccionar una opción en cada desplegable de la sección Clasificación hasta llegar al último nivel disponible.',
      });
      return;
    }
    if (!this.problemDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripcion' }); return; }
    if (!this.reasonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese las causas' }); return; }
    if (!this.lessonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la leccion aprendida' }); return; }
    if (!this.impactDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese el impacto' }); return; }

    const form = new FormData();
    form.append('ProjectId', String(this.projectId));
    form.append('LessonAreaId', String(this.lessonAreaId));

    const catalogItemId = this.deepestSelectedCatalogItemId;
    if (catalogItemId) form.append('CatalogItemId', String(catalogItemId));

    form.append('ProblemDescription', this.problemDescription);
    form.append('ReasonDescription', this.reasonDescription);
    form.append('LessonDescription', this.lessonDescription);
    form.append('ImpactDescription', this.impactDescription);
    this.opportunityFiles.forEach((f) => form.append('OpportunityImages', f));
    this.improvementFiles.forEach((f) => form.append('ImprovementImages', f));

    this.loaderService.show();
    this.lessonService.createLesson(form).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'Leccion creada exitosamente', icon: 'success', draggable: true });
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
