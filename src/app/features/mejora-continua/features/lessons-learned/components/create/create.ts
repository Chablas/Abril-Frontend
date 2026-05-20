import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../../shared/components/image-preview/image-preview';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LeccionesAprendidasService } from '../../services/lecciones-aprendidas.service';
import { SubAreaService } from '../../../configuration/areas-subareas/services/subarea.service';
import { SubAreaSimpleDTO } from '../../../configuration/areas-subareas/dtos/subAreaSimple.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LessonFiltersDTO } from '../../dtos/lessonFilters.model';
import { ScopeItemDTO } from '../../dtos/scope-item.model';
import Swal from 'sweetalert2';

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

  // Ubicacion
  projectId: number = 0;
  areaId: number = 0;
  subAreaId: number | undefined = undefined;
  subAreas: SubAreaSimpleDTO[] = [];
  private allSubAreas: SubAreaSimpleDTO[] = [];

  // Árbol de scope genérico
  // Cada índice representa un nivel: levels[0] = fases, levels[1] = etapas del fase seleccionada, etc.
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
    private subAreaService: SubAreaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadAllSubAreas();
  }

  // ── Helpers de árbol ────────────────────────────────────────────────────────

  getLevelLabel(levelIndex: number): string {
    return this.scopeLevels[levelIndex]?.[0]?.catalogTypeName ?? `Nivel ${levelIndex + 1}`;
  }

  onScopeItemChange(levelIndex: number, selectedId: number | undefined): void {
    // Encontrar el ítem seleccionado
    const selected = selectedId
      ? this.scopeLevels[levelIndex]?.find(i => i.scopeItemId === selectedId)
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

  // ── Carga de datos ───────────────────────────────────────────────────────────

  private loadScopeData(): void {
    if (!this.areaId) return;
    this.loaderService.show();
    this.lessonService.getFiltersCreate(this.areaId, this.subAreaId).subscribe({
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

  private loadAllSubAreas(): void {
    this.subAreaService.getAllSubAreaSimple().subscribe({
      next: (data) => (this.allSubAreas = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onAreaChange(): void {
    this.subAreaId = undefined;
    this.subAreas = this.areaId ? this.allSubAreas.filter(sa => sa.areaId === this.areaId) : [];
    this.scopeLevels = [];
    this.selectedScopeItems = [];
    this.loadScopeData();
  }

  onSubAreaChange(): void {
    this.scopeLevels = [];
    this.selectedScopeItems = [];
    this.loadScopeData();
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
    if (!this.areaId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar area' }); return; }
    if (!this.problemDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripcion' }); return; }
    if (!this.reasonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese las causas' }); return; }
    if (!this.lessonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la leccion aprendida' }); return; }
    if (!this.impactDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese el impacto' }); return; }

    const form = new FormData();
    form.append('ProjectId', String(this.projectId));
    form.append('AreaId', String(this.areaId));
    if (this.subAreaId) form.append('SubAreaId', String(this.subAreaId));

    const catalogItemId = this.deepestSelectedCatalogItemId;
    if (catalogItemId) form.append('CatalogItemId', String(catalogItemId));

    form.append('ProblemDescription', this.problemDescription);
    form.append('ReasonDescription', this.reasonDescription);
    form.append('LessonDescription', this.lessonDescription);
    form.append('ImpactDescription', this.impactDescription);
    this.opportunityFiles.forEach(f => form.append('OpportunityImages', f));
    this.improvementFiles.forEach(f => form.append('ImprovementImages', f));

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
