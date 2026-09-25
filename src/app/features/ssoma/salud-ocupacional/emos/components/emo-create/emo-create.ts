import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../../../shared/worker-search-input/worker-search-input';
import { EmoService } from '../../../services/emo.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  EmpresaSimpleDto,
  ExamenTipoDto,
  MedicoSimpleDto,
  RestriccionTipoDto,
} from '../../../dtos/catalogos.model';
import { WorkerSearchItemDto } from '../../../dtos/worker-search.model';
import {
  AptitudEmo,
  EmoCreateDto,
  EmoExamenCreateDto,
  EmoRestriccionCreateDto,
} from '../../../dtos/emo.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ClinicaProgramacionService } from '../../../../../clinica/services/clinica-programacion.service';
import { RazonSocialCupo } from '../../../../../../shared/dtos/razon-social.dto';
import { APTITUD_CHART_ORDER } from '../../../shared/aptitud.utils';

type StepKey = 1 | 2 | 3;

interface ExamenRow extends EmoExamenCreateDto {
  nombre: string;
}

@Component({
  selector: 'app-emo-create',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, WorkerSearchInput],
  templateUrl: './emo-create.html',
  styleUrl: './emo-create.css',
})
export class EmoCreate implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly aptitudes: AptitudEmo[] = APTITUD_CHART_ORDER;

  step: StepKey = 1;
  saving = false;

  // Paso 1
  workerSelected: WorkerSearchItemDto | null = null;
  tipoEmoId = 0;
  empresaOrigenId = 0;
  fechaEmo = '';
  clinicaId: number | null = null;
  medicoId: number | null = null;
  numeroInforme = '';
  urlResultado = '';

  /**
   * Razón social con la que entra una ficha de pre-ingreso. Registrar su EMO de Ingreso sin
   * haberlo programado es, como programarlo, el punto donde se elige: sin ella llegaba sin ninguna
   * a la carta oferta. Solo se cargan las opciones cuando el trabajador elegido es de pre-ingreso.
   */
  razonesSociales: RazonSocialCupo[] = [];
  /** true = la vacante de la que sale es un REEMPLAZO, así que el tope de 20 no corta. */
  sinTopePorReemplazo = false;
  razonSocialId: number | null = null;

  // Paso 2
  aptitud: AptitudEmo = 'Apto';
  requiereInterconsulta = false;
  restricciones: EmoRestriccionCreateDto[] = [];
  restriccionTipoIdSel = 0;
  restriccionLibre = '';

  // Paso 3
  examenes: ExamenRow[] = [];

  notas = '';

  // Catálogos
  emoTipos: EmoTipoDto[] = [];
  empresas: EmpresaSimpleDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];
  restriccionTipos: RestriccionTipoDto[] = [];
  examenTipos: ExamenTipoDto[] = [];

  constructor(
    private service: EmoService,
    private catalogos: CatalogosSaludService,
    private programacionService: ClinicaProgramacionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCatalogos();
  }

  ngOnDestroy(): void {}

  private loadCatalogos(): void {
    this.catalogos.getEmoTipos().subscribe({
      next: (res) => {
        this.emoTipos = res;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getEmpresas().subscribe({
      next: (res) => {
        this.empresas = res;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getClinicas().subscribe({
      next: (res) => {
        this.clinicas = res;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getMedicos().subscribe({
      next: (res) => {
        this.medicos = res;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getRestriccionTipos().subscribe({
      next: (res) => {
        this.restriccionTipos = res;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getExamenTipos().subscribe({
      next: (res) => {
        this.examenTipos = res;
        this.syncExamenRows();
        this.cdr.detectChanges();
      },
    });
  }

  get medicosFiltrados(): MedicoSimpleDto[] {
    if (!this.clinicaId) return this.medicos;
    return this.medicos.filter((m) => !m.clinicaId || m.clinicaId === this.clinicaId);
  }

  onClinicaChange(id: number | null): void {
    this.clinicaId = id;
    if (id && this.medicoId) {
      const match = this.medicos.find((m) => m.id === this.medicoId);
      if (match && match.clinicaId && match.clinicaId !== id) {
        this.medicoId = null;
      }
    }
  }

  // Worker search
  onWorkerSelectedChange(w: WorkerSearchItemDto | null): void {
    this.workerSelected = w;
    if (w?.empresaActualId && !this.empresaOrigenId) {
      this.empresaOrigenId = w.empresaActualId;
    }
    if (!w) {
      this.empresaOrigenId = 0;
    }
    this.razonesSociales = [];
    this.sinTopePorReemplazo = false;
    this.razonSocialId = null;
    if (w?.esFinalistaAprobado) this.cargarRazonesSociales(w.id);
  }

  // Razón social (ficha de pre-ingreso)
  private cargarRazonesSociales(workerId: number): void {
    this.programacionService.getRazonesSociales(workerId).subscribe({
      next: (res) => {
        // Otro trabajador elegido mientras llegaba la respuesta: no es la suya.
        if (this.workerSelected?.id !== workerId) return;
        this.razonesSociales = res?.razones ?? [];
        this.sinTopePorReemplazo = res?.sinTopePorReemplazo ?? false;
        // La que la ficha ya trae (se la eligieron al programarle el EMO) queda elegida. Solo si
        // está en la lista: una que ya no se ofrece el backend tampoco la acepta.
        const actual = res?.razonSocialActualId;
        if (actual && this.razonesSociales.some((r) => r.id === actual)) this.razonSocialId = actual;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private get esIngreso(): boolean {
    return this.emoTipos.find((t) => t.id === this.tipoEmoId)?.nombre?.trim().toLowerCase() === 'ingreso';
  }

  /** Solo en el EMO de Ingreso de una ficha de pre-ingreso: es el que la hace entrar. */
  get pideRazonSocial(): boolean {
    return !!this.workerSelected?.esFinalistaAprobado && this.esIngreso;
  }

  get razonSocialSeleccionada(): RazonSocialCupo | null {
    return this.razonesSociales.find((r) => r.id === this.razonSocialId) ?? null;
  }

  /** Llena y sin excepción de reemplazo: no se puede guardar (el backend tampoco la acepta). */
  get sinCupos(): boolean {
    return !this.sinTopePorReemplazo && this.razonSocialSeleccionada?.cuposDisponibles === 0;
  }

  /** Llena, pero se deja pasar porque la vacante es un REEMPLAZO. */
  get excedePorReemplazo(): boolean {
    return this.sinTopePorReemplazo && this.razonSocialSeleccionada?.cuposDisponibles === 0;
  }

  // Restricciones
  addRestriccion(): void {
    if (this.restriccionTipoIdSel) {
      const tipo = this.restriccionTipos.find((r) => r.id === this.restriccionTipoIdSel);
      if (tipo && !this.restricciones.some((x) => x.restriccionTipoId === tipo.id)) {
        this.restricciones.push({ restriccionTipoId: tipo.id });
      }
      this.restriccionTipoIdSel = 0;
      return;
    }
    const libre = this.restriccionLibre.trim();
    if (libre) {
      this.restricciones.push({ descripcionLibre: libre });
      this.restriccionLibre = '';
    }
  }

  removeRestriccion(idx: number): void {
    this.restricciones.splice(idx, 1);
  }

  restriccionLabel(r: EmoRestriccionCreateDto): string {
    if (r.restriccionTipoId) {
      const t = this.restriccionTipos.find((x) => x.id === r.restriccionTipoId);
      return t?.descripcion ?? 'Restricción';
    }
    return r.descripcionLibre ?? '';
  }

  // Exámenes
  private syncExamenRows(): void {
    if (this.examenes.length > 0) return;
    this.examenes = this.examenTipos.map((t) => ({
      examenTipoId: t.id,
      nombre: t.nombre,
      resultado: '',
      valor: '',
      unidad: '',
      observacion: '',
    }));
  }

  // Navegación pasos
  get canAdvanceStep1(): boolean {
    if (this.pideRazonSocial && (!this.razonSocialId || this.sinCupos)) return false;
    return !!(
      this.workerSelected &&
      this.tipoEmoId &&
      this.empresaOrigenId &&
      this.fechaEmo
    );
  }

  get canAdvanceStep2(): boolean {
    return !!this.aptitud;
  }

  get canSubmit(): boolean {
    return this.canAdvanceStep1 && this.canAdvanceStep2 && !this.saving;
  }

  nextStep(): void {
    if (this.step === 1 && !this.canAdvanceStep1) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: this.pideRazonSocial
          ? 'Selecciona trabajador, tipo de EMO, empresa, razón social con cupo y fecha antes de continuar.'
          : 'Selecciona trabajador, tipo de EMO, empresa y fecha antes de continuar.',
      });
      return;
    }
    if (this.step === 2 && !this.canAdvanceStep2) {
      Swal.fire({
        icon: 'warning',
        title: 'Aptitud requerida',
        text: 'Selecciona un valor de aptitud.',
      });
      return;
    }
    if (this.step < 3) this.step = ((this.step + 1) as StepKey);
  }

  prevStep(): void {
    if (this.step > 1) this.step = ((this.step - 1) as StepKey);
  }

  goToStep(s: StepKey): void {
    if (s < this.step) this.step = s;
  }

  // Submit
  submit(): void {
    if (!this.canSubmit || !this.workerSelected) return;

    const payload: EmoCreateDto = {
      workerId: this.workerSelected.id,
      tipoEmoId: this.tipoEmoId,
      empresaOrigenId: this.empresaOrigenId,
      razonSocialId: this.pideRazonSocial ? (this.razonSocialId ?? undefined) : undefined,
      fechaEmo: this.fechaEmo,
      clinicaId: this.clinicaId || undefined,
      medicoId: this.medicoId || undefined,
      aptitud: this.aptitud,
      requiereInterconsulta: this.aptitud === 'Observado' && this.requiereInterconsulta,
      numeroInforme: this.numeroInforme || undefined,
      urlResultado: this.urlResultado || undefined,
      notas: this.notas || undefined,
      examenes: this.examenes
        .filter((e) => e.resultado || e.valor || e.observacion)
        .map(({ nombre, ...rest }) => rest),
      restricciones: [...this.restricciones],
    };

    this.saving = true;
    this.loaderService.show();
    this.service.createEmo(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'EMO registrado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
