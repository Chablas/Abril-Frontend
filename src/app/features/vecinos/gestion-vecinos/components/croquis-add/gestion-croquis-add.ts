import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
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
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, SectionTabs],
  templateUrl: './gestion-croquis-add.html',
})
export class GestionCroquisAdd {
  /** Todos los proyectos (con o sin croquis). */
  @Input() projects: ProjectOptionDTO[] = [];
  /** Croquis registrados (proyecto + lotes) para la sección de ubicación. */
  @Input() croquis: CroquisGestionDTO[] = [];
  @Input() colindancias: CatalogOptionDTO[] = [];
  @Input() tiposConstruccion: CatalogOptionDTO[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  readonly tabs: SectionTab[] = [
    { id: 'generales', label: 'Datos generales' },
    { id: 'ubicacion', label: 'Ubicación en croquis' },
  ];
  activeTab = 'generales';

  form: VecinoCreateDTO = {
    projectId: null,
    predio: '',
    direccion: '',
    interiorDepartamento: '',
    nombrePropietario: '',
    dni: '',
    celular: '',
    vecinoColindanciaId: null,
    vecinoTipoConstruccionId: null,
  };

  selectedCroquis: CroquisGestionDTO | null = null;
  selectedLote: CroquisGestionLoteDTO | null = null;

  dniLookupLoading = false;

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

  // ── DNI / RENIEC ───────────────────────────────────────────────────────
  searchReniec(): void {
    if (this.form.dni.length !== 8) return;
    this.dniLookupLoading = true;
    this.loaderService.show();
    this.service.getPersonByDni(this.form.dni).subscribe({
      next: (data) => {
        this.form.nombrePropietario = data.full_name?.trim()
          || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupLoading = false;
        this.loaderService.hide();
        Swal.fire({
          icon: err.status === 404 ? 'warning' : 'info',
          title: err.status === 404 ? 'DNI no encontrado' : 'No se pudo consultar RENIEC',
          text: 'Ingresa el nombre del propietario o representante manualmente.',
        });
      },
    });
  }

  onDniKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.searchReniec(); return; }
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
    if (!this.form.dni?.trim() || !/^\d{8}$/.test(this.form.dni.trim()))
      errors.push({ tab: 'generales', campo: 'DNI (8 dígitos)' });
    if (!this.form.nombrePropietario?.trim()) errors.push({ tab: 'generales', campo: 'Propietario o representante' });
    if (!this.form.direccion?.trim()) errors.push({ tab: 'generales', campo: 'Dirección' });
    if (!this.form.vecinoColindanciaId) errors.push({ tab: 'generales', campo: 'Colindante / No colindante' });
    if (!this.form.vecinoTipoConstruccionId) errors.push({ tab: 'generales', campo: 'Tipo de construcción' });
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
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service.create(this.form).subscribe({
      next: (res) => {
        const vecinoId = res.vecinoId;
        // Si se eligió un lote, vincular el vecino recién creado a ese lote.
        if (this.selectedLote && vecinoId) {
          this.service.assignVecinoToLote(this.selectedLote.projectCroquisLoteId, vecinoId).subscribe({
            next: () => {
              this.loaderService.hide();
              this.successAndClose();
            },
            error: (err: HttpErrorResponse) => {
              this.loaderService.hide();
              // El vecino sí se creó; avisamos que la vinculación al lote falló.
              this.errorService.handleError(err);
              this.created.emit();
            },
          });
        } else {
          this.loaderService.hide();
          this.successAndClose();
        }
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
      title: '¡Vecino registrado!',
      text: 'El vecino fue registrado correctamente.',
      confirmButtonColor: '#64BC04',
    });
    this.created.emit();
  }
}
