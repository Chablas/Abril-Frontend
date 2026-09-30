import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { swalUdpSuccess } from '../../../../../shared/utils/sweetalert-udp';
import { ContratosService } from '../../services/contratos.service';
import {
  ContratoCatalogosDTO,
  ContratoContratistaOption,
  ProjectContractCreateDTO,
  ProjectContractDTO,
  ProjectContractEditDTO,
} from '../../dtos/contrato.dtos';
import { CONTRATO_PASOS } from '../../constants/contrato-pasos';
import { recalcularHitos } from '../../utils/contrato-local';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de creación y edición de un contrato (paso 2, "Datos del contrato"). Sin `contrato` crea
 * uno nuevo en `projectId`; con `contrato` lo edita (contratista y especialidad quedan fijos: el
 * PUT del backend no los acepta).
 *
 * Ninguna de las dos ramas recarga con un GET después de guardar (regla 1 acción = 1 HTTP): la
 * creación arma el contrato nuevo en memoria con lo enviado + los catálogos, y la edición muta el
 * objeto recibido, que es la misma referencia que muestran la lista y el detalle.
 */
@Component({
  selector: 'app-contrato-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, DatePicker],
  templateUrl: './contrato-form.html',
  styleUrls: ['../../shared/contratos-ui.css', './contrato-form.css'],
})
export class ContratoForm implements OnInit {
  @Input({ required: true }) catalogos!: ContratoCatalogosDTO;
  /** Proyecto donde se crea (solo creación). */
  @Input() projectId: number | null = null;
  @Input() projectName = '';
  /** Contrato a editar; null = crear. */
  @Input() contrato: ProjectContractDTO | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<ProjectContractDTO>();
  @Output() updated = new EventEmitter<ProjectContractDTO>();

  readonly accent = 'var(--color-abril-standard)';

  contractorId: number | null = null;
  workSpecialtyId: number | null = null;
  serviceDescription = '';
  amount: number | null = null;
  currencyId: number | null = null;
  contractorEmail = '';
  signingDate: string | null = null;
  startDate: string | null = null;
  endDate: string | null = null;
  termDays: number | null = null;
  detalleServicios = '';

  submitted = false;
  saving = false;

  constructor(
    private service: ContratosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get esEdicion(): boolean {
    return !!this.contrato;
  }

  ngOnInit(): void {
    const c = this.contrato;
    if (c) {
      this.contractorId = c.contractorId;
      this.workSpecialtyId = c.workSpecialtyId;
      this.serviceDescription = c.serviceDescription ?? '';
      this.amount = c.amount;
      this.currencyId = c.currencyId;
      this.contractorEmail = c.contractorEmail ?? '';
      this.signingDate = c.signingDate ?? null;
      this.startDate = c.startDate ?? null;
      this.endDate = c.endDate ?? null;
      this.termDays = c.termDays ?? null;
      this.detalleServicios = c.detalleServicios ?? '';
      return;
    }
    // Moneda por defecto: soles, si existe en el catálogo.
    this.currencyId = this.catalogos.currencies.find((m) => m.currencyCode === 'PEN')?.currencyId ?? null;
  }

  get contratistaSeleccionado(): ContratoContratistaOption | undefined {
    return this.catalogos.contributors.find((c) => c.contractorId === this.contractorId);
  }

  /** Correos registrados del contratista elegido que todavía no están en el campo. */
  get correosSugeridos(): string[] {
    const emails = this.contratistaSeleccionado?.emails ?? [];
    return emails.filter((e) => e && e !== this.contractorEmail.trim());
  }

  onContratistaChange(contractorId: number | null): void {
    this.contractorId = contractorId;
    // Se precarga el primer correo registrado solo si el campo está vacío — nunca pisa lo escrito.
    if (!this.contractorEmail.trim()) {
      this.contractorEmail = this.contratistaSeleccionado?.emails?.[0] ?? '';
    }
  }

  get emailInvalido(): boolean {
    const e = this.contractorEmail.trim();
    return !!e && !EMAIL_RE.test(e);
  }

  get fechasInvalidas(): boolean {
    return !!this.startDate && !!this.endDate && this.endDate < this.startDate;
  }

  get plazoInvalido(): boolean {
    return this.termDays !== null && (this.termDays < 0 || !Number.isInteger(Number(this.termDays)));
  }

  get formularioValido(): boolean {
    return (
      !!this.contractorId &&
      !!this.workSpecialtyId &&
      !!this.currencyId &&
      this.amount !== null &&
      Number(this.amount) > 0 &&
      !this.emailInvalido &&
      !this.fechasInvalidas &&
      !this.plazoInvalido
    );
  }

  private buildEditDto(): ProjectContractEditDTO {
    return {
      serviceDescription: this.serviceDescription.trim() || null,
      amount: Number(this.amount),
      currencyId: this.currencyId!,
      contractorEmail: this.contractorEmail.trim() || null,
      signingDate: this.signingDate || null,
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      termDays: this.termDays === null || (this.termDays as unknown) === '' ? null : Number(this.termDays),
      detalleServicios: this.detalleServicios.trim() || null,
    };
  }

  guardar(): void {
    this.submitted = true;
    if (!this.formularioValido || this.saving) return;
    if (this.esEdicion) this.guardarEdicion();
    else this.guardarCreacion();
  }

  private guardarCreacion(): void {
    if (!this.projectId) return;
    const dto: ProjectContractCreateDTO = {
      projectId: this.projectId,
      contractorId: this.contractorId!,
      workSpecialtyId: this.workSpecialtyId!,
      ...this.buildEditDto(),
    };

    this.saving = true;
    this.loaderService.show();
    this.service.crear(dto).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        this.created.emit(this.construirContratoNuevo(res.projectContractId, dto));
        swalUdpSuccess(res.message ?? 'Contrato creado exitosamente.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  private guardarEdicion(): void {
    const contrato = this.contrato!;
    const dto = this.buildEditDto();

    this.saving = true;
    this.loaderService.show();
    this.service.editar(contrato.projectContractId, dto).subscribe({
      next: (res) => {
        Object.assign(contrato, dto, { currencyCode: this.codigoMoneda(dto.currencyId) });
        // El monto pudo cambiar: el monto de cada hito depende de él.
        recalcularHitos(contrato);
        this.saving = false;
        this.loaderService.hide();
        this.updated.emit(contrato);
        swalUdpSuccess(res.message ?? 'Contrato actualizado exitosamente.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  private codigoMoneda(currencyId: number): string | null {
    return this.catalogos.currencies.find((m) => m.currencyId === currencyId)?.currencyCode ?? null;
  }

  /** Mismo shape que devolvería GET /{id} para un contrato recién creado (estado 1, sin hitos). */
  private construirContratoNuevo(projectContractId: number, dto: ProjectContractCreateDTO): ProjectContractDTO {
    return {
      ...dto,
      projectContractId,
      contractorName: this.contratistaSeleccionado?.contributorName ?? null,
      workSpecialtyDescription:
        this.catalogos.workSpecialties.find((w) => w.workSpecialtyId === dto.workSpecialtyId)
          ?.workSpecialtyDescription ?? null,
      projectContractStatusId: 1,
      projectContractStatusDescription: CONTRATO_PASOS[0],
      contractNumber: null,
      currencyCode: this.codigoMoneda(dto.currencyId),
      createdDateTime: new Date().toISOString(),
      active: true,
      milestones: [],
      contractorNotificationSkipped: false,
      arrivedWithObservations: null,
      arrivalObservation: null,
      step6SignedJefeProyectos: false,
      step6SignedGerenteInmobiliario: false,
      step6SignedGerenteGeneral: false,
    };
  }
}
