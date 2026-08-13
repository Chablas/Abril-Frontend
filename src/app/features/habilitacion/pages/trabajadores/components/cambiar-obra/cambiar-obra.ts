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
import { CatalogosHabService } from '../../../../services/catalogos-hab.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { CatalogosSaludService } from '../../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';

/**
 * Cada dimensión (obra, razón social, puesto, clasificación) se marca por separado con su
 * propio checkbox. Los campos SIEMPRE viajan prellenados con el valor actual del trabajador;
 * el checkbox solo controla si el admin puede editarlos. Así, si un checkbox queda sin marcar,
 * el valor que se envía es idéntico al actual — el backend lo compara contra lo que ya tenía
 * y no dispara ningún efecto (reset de aptitud, notificación, etc.) para esa dimensión. Esto
 * es lo que hace posible combinar libremente "solo puesto", "solo razón social", "obra +
 * puesto", etc., sin arrastrar cambios no marcados explícitamente.
 */
interface CambiarObraForm {
  cambiaObra: boolean;
  proyectoId: number | null;

  cambiaEmpresa: boolean;
  empresaId: number | null;

  cambiaPuesto: boolean;
  /** FK a `puesto`: el puesto al que pasa. */
  puestoId: number | null;

  cambiaStaffOficina: boolean;
  staffOficina: number | null;

  fechaCambio: string;
}

@Component({
  selector: 'app-hab-cambiar-obra',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './cambiar-obra.html',
  styleUrl: './cambiar-obra.css',
})
export class CambiarObra implements OnChanges {
  @Input() open = false;
  @Input() worker: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  empresas: EmpresaSimpleDto[] = [];
  puestos: { id: number; nombre: string; categoriaId: number | null }[] = [];

  model: CambiarObraForm = this.empty();
  saving = false;
  loadingCatalogos = false;

  // IDs fijos del catálogo workers_obra_oficina_staff (ver ObraOficinaStaffIds en el backend).
  readonly OFICINA_CENTRAL_ID = 3;
  staffOficinaOptions = [
    { id: 1, nombre: 'Obra' },
    { id: 2, nombre: 'Staff' },
    { id: 3, nombre: 'Oficina Central' },
  ];

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private catalogosService: CatalogosSaludService,
    private catalogosHabService: CatalogosHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      // Prellenados con lo actual del trabajador — cada campo queda bloqueado (readonly) hasta
      // que se marque su checkbox, así nunca viaja un valor "inventado" por defecto.
      this.model.proyectoId = this.worker?.proyectoActualId ?? null;
      this.model.empresaId = this.worker?.empresaId ?? null;
      this.model.staffOficina = this.worker?.obraOficinaStaffId ?? 1;
      this.loadCatalogos();
    }
  }

  private empty(): CambiarObraForm {
    return {
      cambiaObra: false,
      proyectoId: null,
      cambiaEmpresa: false,
      empresaId: null,
      cambiaPuesto: false,
      puestoId: null,
      cambiaStaffOficina: false,
      staffOficina: 1,
      fechaCambio: new Date().toISOString().substring(0, 10),
    };
  }

  /** La razón social solo se gestiona acá para trabajadores "Casa" (propios de Abril) — para
   * contratistas, la empresa es la del contrato y se gestiona por otro flujo. Se mantiene la
   * misma regla que ya regía el formulario anterior. */
  get puedeEditarEmpresa(): boolean {
    return this.worker?.contrataCasa === 'Casa';
  }

  get puedeEditarStaffOficina(): boolean {
    return this.worker?.contrataCasa === 'Casa';
  }

  private loadCatalogos(): void {
    this.loadingCatalogos = true;
    this.catalogosHabService.getPuestos().subscribe({
      next: (res) => {
        this.puestos = res ?? [];
        this.cdr.detectChanges();
      },
      error: () => (this.puestos = []),
    });
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.proyectos = [];
        this.errorService.handleError(err);
      },
    });
    this.catalogosService.getEmpresas().subscribe({
      next: (res) => {
        this.empresas = res ?? [];
        this.loadingCatalogos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.empresas = [];
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
      },
    });
  }

  get title(): string {
    return 'Cambiar obra / razón social / puesto de trabajo';
  }

  /** Sube de riesgo (Oficina Central → Staff/Obra): el certificado de aptitud actual no
   * cubre el nuevo puesto, se exigirá un EMO nuevo — no basta con convalidar. Solo aplica si
   * el checkbox de clasificación está marcado (si no, staffOficina viaja igual al actual). */
  get esCambioRiesgoCritico(): boolean {
    if (!this.model.cambiaStaffOficina) return false;
    const actual = this.worker?.obraOficinaStaffId ?? null;
    return actual === this.OFICINA_CENTRAL_ID
      && this.model.staffOficina !== this.OFICINA_CENTRAL_ID
      && this.model.staffOficina !== null;
  }

  /** Al menos una dimensión debe estar marcada — de lo contrario no hay nada que cambiar. */
  get algunCambioMarcado(): boolean {
    return this.model.cambiaObra || this.model.cambiaEmpresa
      || this.model.cambiaPuesto || this.model.cambiaStaffOficina;
  }

  get canSubmit(): boolean {
    if (this.saving || !this.algunCambioMarcado || !this.model.fechaCambio) return false;
    if (this.model.cambiaObra && !this.model.proyectoId) return false;
    if (this.model.cambiaEmpresa && !this.model.empresaId) return false;
    if (this.model.cambiaPuesto && this.model.puestoId == null) return false;
    if (this.model.cambiaStaffOficina && !this.model.staffOficina) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) return;

    const empresaId = this.puedeEditarEmpresa ? this.model.empresaId : null;

    const payload = {
      // proyectoId siempre viaja: si "cambiaObra" no está marcado, es el mismo valor actual
      // (precargado en ngOnChanges), así que el backend no detecta cambio de obra.
      nuevoProyectoId: this.model.proyectoId,
      nuevaEmpresaId: empresaId ?? undefined,
      // puesto y staffOficina solo viajan si su checkbox está marcado — evita que el
      // backend calcule un "cambio" contra un valor que el admin nunca tocó a propósito.
      puestoId: this.model.cambiaPuesto ? this.model.puestoId ?? undefined : undefined,
      obraOficinaStaffId: this.model.cambiaStaffOficina ? this.model.staffOficina ?? undefined : undefined,
      fechaCambio: this.model.fechaCambio,
    };

    this.saving = true;
    this.loaderService.show();

    this.trabajadorHabService.cambiarObra(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Cambio registrado',
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
