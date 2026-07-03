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
import {
  DocumentTypeDto,
  EmoPorTrabajadorDto,
  WorkerDatosBasicosDto,
} from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';

interface EditModel {
  nombreCompleto: string;
  documentIdentityTypeId: number | null;
  numeroDocumento: string;
  cumpleanos: string; // 'YYYY-MM-DD'
  categoria: string;
  ocupacion: string;
  ocupacionId: number | null;
  puesto: string;
}

/**
 * Edición mínima de un trabajador (Configuración → Trabajadores). Por ahora solo
 * permite cambiar nombre completo, tipo y número de documento y cumpleaños; todos
 * viven en la tabla `person`, por eso se usa el endpoint dedicado `datos-basicos`
 * que no toca el resto de campos del worker.
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

  constructor(
    private workerService: WorkerService,
    private catalogosHabService: CatalogosHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadCatalogos();
    }
  }

  private empty(): EditModel {
    return {
      nombreCompleto: '',
      documentIdentityTypeId: null,
      numeroDocumento: '',
      cumpleanos: '',
      categoria: '',
      ocupacion: '',
      ocupacionId: null,
      puesto: '',
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
      categoria: this.worker.categoria ?? '',
      ocupacion: this.worker.ocupacion ?? '',
      ocupacionId: this.worker.ocupacionId ?? null,
      puesto: this.worker.puesto ?? '',
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
      categoria: this.model.categoria?.trim() || null,
      ocupacion: this.model.ocupacion?.trim() || null,
      ocupacionId: this.model.ocupacionId ?? null,
      puesto: this.model.puesto?.trim() || null,
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
