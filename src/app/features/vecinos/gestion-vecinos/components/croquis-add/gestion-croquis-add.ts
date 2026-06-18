import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { environment } from '../../../../../../environments/environment';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  CatalogOptionDTO,
  CroquisGestionDTO,
  CroquisGestionLoteDTO,
  ProjectOptionDTO,
  VecinoCreateDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-croquis-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, SectionTabs, FileSelector],
  templateUrl: './gestion-croquis-add.html',
})
export class GestionCroquisAdd {
  /** Todos los proyectos (con o sin croquis). */
  @Input() projects: ProjectOptionDTO[] = [];
  /** Croquis registrados (proyecto + lotes) para la sección de ubicación. */
  @Input() croquis: CroquisGestionDTO[] = [];
  @Input() colindancias: CatalogOptionDTO[] = [];
  @Input() tiposConstruccion: CatalogOptionDTO[] = [];
  @Input() usos: CatalogOptionDTO[] = [];
  @Input() relacionTipos: CatalogOptionDTO[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  readonly tabs: SectionTab[] = [
    { id: 'generales', label: 'Datos generales' },
    { id: 'ubicacion', label: 'Ubicación en croquis' },
  ];
  activeTab = 'generales';

  form: VecinoCreateDTO = {
    projectId: null,
    vecinoUsoId: null,
    direccion: '',
    interiorDepartamento: '',
    vecinoColindanciaId: null,
    vecinoTipoConstruccionId: null,
    observaciones: '',
    personas: [{ nombre: '', dni: '', celular: '', vecinoRelacionTipoId: null }],
  };

  selectedCroquis: CroquisGestionDTO | null = null;
  selectedLote: CroquisGestionLoteDTO | null = null;

  /** Índice de la persona cuya consulta RENIEC está en curso (-1 = ninguna). */
  dniLookupIndex = -1;

  /** Imágenes del estado de la propiedad seleccionadas (aún no subidas). */
  selectedImages: SelectedFile[] = [];

  trackByIndex(index: number): number {
    return index;
  }

  // ── Imágenes (estado de la propiedad) ──────────────────────────────────
  onImageSelected(file: SelectedFile): void {
    if (!file.file.type.startsWith('image/')) return;
    this.selectedImages.push(file);
  }

  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
  }

  // ── Personas ───────────────────────────────────────────────────────────
  addPersona(): void {
    this.form.personas.push({ nombre: '', dni: '', celular: '', vecinoRelacionTipoId: null });
  }

  removePersona(index: number): void {
    if (this.form.personas.length <= 1) return;
    this.form.personas.splice(index, 1);
  }

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  imageSrc(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  onProjectChange(projectId: number | null): void {
    this.form.projectId = projectId;
    this.selectedCroquis = this.croquis.find((c) => c.projectId === projectId) ?? null;
    this.selectedLote = null;
  }

  // ── DNI / RENIEC (por persona) ─────────────────────────────────────────
  searchReniec(index: number): void {
    const persona = this.form.personas[index];
    if (!persona || persona.dni.length !== 8) return;
    this.dniLookupIndex = index;
    this.loaderService.show();
    this.service.getPersonByDni(persona.dni).subscribe({
      next: (data) => {
        persona.nombre = data.full_name?.trim()
          || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupIndex = -1;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupIndex = -1;
        this.loaderService.hide();
        Swal.fire({
          icon: err.status === 404 ? 'warning' : 'info',
          title: err.status === 404 ? 'DNI no encontrado' : 'No se pudo consultar RENIEC',
          text: 'Ingresa el nombre de la persona manualmente.',
        });
      },
    });
  }

  onDniKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter') { event.preventDefault(); this.searchReniec(index); return; }
    this.blockNonDigits(event);
  }

  onNumericKeydown(event: KeyboardEvent): void {
    this.blockNonDigits(event);
  }

  private blockNonDigits(event: KeyboardEvent): void {
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  // ── Lotes (sección ubicación) ──────────────────────────────────────────
  selectLote(lote: CroquisGestionLoteDTO): void {
    this.selectedLote = lote;
  }

  pointsToSvg(puntos: number[][]): string {
    return puntos.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ');
  }

  centroid(puntos: number[][]): { x: number; y: number } {
    const n = puntos.length || 1;
    return {
      x: (puntos.reduce((a, p) => a + p[0], 0) / n) * 100,
      y: (puntos.reduce((a, p) => a + p[1], 0) / n) * 100,
    };
  }

  loteFill(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return 'rgba(0,134,165,0.45)';
    return lote.vecinoId ? 'rgba(100,188,4,0.35)' : 'rgba(156,163,175,0.25)';
  }

  loteStroke(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return '#0086A5';
    return lote.vecinoId ? '#64BC04' : '#9CA3AF';
  }

  // ── Validación + submit ────────────────────────────────────────────────
  private getValidationErrors(): { tab: string; campo: string }[] {
    const errors: { tab: string; campo: string }[] = [];
    if (!this.form.direccion?.trim()) errors.push({ tab: 'generales', campo: 'Dirección' });
    if (!this.form.interiorDepartamento?.trim()) errors.push({ tab: 'generales', campo: 'Interior / Departamento' });
    if (!this.form.vecinoUsoId) errors.push({ tab: 'generales', campo: 'Uso' });
    if (!this.form.vecinoColindanciaId) errors.push({ tab: 'generales', campo: 'Colindante / No colindante' });
    if (!this.form.vecinoTipoConstruccionId) errors.push({ tab: 'generales', campo: 'Tipo de construcción' });

    // Personas: al menos una; cada una con nombre, celular y relación. DNI opcional (8 díg. si se ingresa).
    this.form.personas.forEach((p, i) => {
      const n = i + 1;
      if (!p.nombre?.trim()) errors.push({ tab: 'generales', campo: `Persona ${n}: nombre` });
      if (!p.celular?.trim()) errors.push({ tab: 'generales', campo: `Persona ${n}: celular` });
      if (!p.vecinoRelacionTipoId) errors.push({ tab: 'generales', campo: `Persona ${n}: relación` });
      if (p.dni?.trim() && !/^\d{8}$/.test(p.dni.trim()))
        errors.push({ tab: 'generales', campo: `Persona ${n}: DNI (8 dígitos)` });
    });

    if (!this.form.projectId) errors.push({ tab: 'ubicacion', campo: 'Proyecto' });
    return errors;
  }

  submit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      // Salta a la primera sección con error.
      this.activeTab = errors[0].tab;
      const listHtml = errors.map((e) => `<li>${e.campo}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service.create(this.form).subscribe({
      next: (res) => {
        const vecinoId = res.vecinoId;

        // Pasos posteriores (independientes): vincular lote y subir imágenes.
        const tasks: Observable<unknown>[] = [];
        if (this.selectedLote && vecinoId)
          tasks.push(this.service.assignVecinoToLote(this.selectedLote.projectCroquisLoteId, vecinoId));
        if (this.selectedImages.length > 0)
          tasks.push(this.service.uploadImagenes(vecinoId, this.selectedImages.map((i) => i.file)));

        if (tasks.length === 0) {
          this.loaderService.hide();
          this.successAndClose();
          return;
        }

        forkJoin(tasks).subscribe({
          next: () => {
            this.loaderService.hide();
            this.successAndClose();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            // La propiedad sí se creó; avisamos que algún paso posterior falló.
            this.errorService.handleError(err);
            this.created.emit();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private successAndClose(): void {
    Swal.fire({
      icon: 'success',
      title: '¡Propiedad registrada!',
      text: 'La propiedad y sus vecinos fueron registrados correctamente.',
      confirmButtonColor: 'var(--color-abril-primary)',
    });
    this.created.emit();
  }
}
