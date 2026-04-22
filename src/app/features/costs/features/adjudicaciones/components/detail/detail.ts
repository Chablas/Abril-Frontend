import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { ProjectSubContractorDTO, ProjectSubContractorFileDTO } from '../../dtos/projectSubContractorDto.model';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { MicrosoftAuthService } from '../../../../../auth/pages/login/services/microsoft-auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail implements OnInit {
  @Input() item!: ProjectSubContractorDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly steps = [
    'Enviado',
    'Datos del contrato',
    'Preparación de documentos',
    'En revisión',
    'Aprobado',
    'Enviado al SC',
    'Llegada a Of. Central',
    'Procesos de firma',
    'Escaneado',
    'Enviado a obra',
  ];

  readonly totalSteps = this.steps.length;

  /** Paso que se está mostrando en pantalla (navegable). */
  viewStep = 1;

  /** Formulario del paso 2. */
  step2Form = { signingDate: '', startDate: '', endDate: '' };

  /** Documentos del paso 3. Se inicializa una sola vez en ngOnInit para evitar re-renders. */
  documents: { key: string; label: string }[] = [];

  trackByDocKey(_: number, doc: { key: string }): string {
    return doc.key;
  }

  private buildDocuments(): { key: string; label: string }[] {
    const base = [
      { key: 'Contract',          label: 'Contrato' },
      { key: 'SummarySheet',      label: 'Hoja Resumen' },
      { key: 'Budget',            label: 'Presupuesto' },
      { key: 'Schedule',          label: 'Cronograma' },
      { key: 'AttachedQuotation', label: 'Cotización Adjunta' },
      { key: 'ServiceOrder',      label: 'Orden de Servicio' },
    ];
    if (this.item.paymentMethodId === 2) {
      return [...base, { key: 'PromissoryNote', label: 'Pagaré' }];
    }
    return base;
  }

  currentDocType: string | null = null;
  uploadingDoc: string | null = null;
  generatingDoc: string | null = null;
  updatingStatusDoc: string | null = null;

  /** Opciones fijas de estado para los documentos. */
  readonly fileStatuses = [
    { id: 1, label: 'Falta' },
    { id: 2, label: 'Observado' },
    { id: 3, label: 'No aplica' },
    { id: 4, label: 'Aprobado' },
    { id: 5, label: 'Enviado' },
  ] as const;

  /** Formulario local de estado/observación por clave de documento. */
  docForms: Record<string, { statusId: number | null; observation: string }> = {};

  /** Tipos de documento que ya tienen generación implementada en el backend. */
  private readonly generableKeys = new Set(['SummarySheet', 'Contract', 'Budget']);

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private microsoftAuthService: MicrosoftAuthService,
  ) {}

  ngOnInit(): void {
    this.viewStep = this.item.projectSubContractorStatusId;
    if (this.item.signingDate) this.step2Form.signingDate = this.item.signingDate.substring(0, 10);
    if (this.item.startDate)   this.step2Form.startDate   = this.item.startDate.substring(0, 10);
    if (this.item.endDate)     this.step2Form.endDate     = this.item.endDate.substring(0, 10);
    this.documents = this.buildDocuments();
    this.initDocForms();
  }

  private initDocForms(): void {
    for (const doc of this.documents) {
      const file = this.getDocFile(doc.key);
      this.docForms[doc.key] = {
        statusId:    file?.statusId    ?? null,
        observation: file?.observation ?? '',
      };
    }
  }

  /** Estado real del item en el backend. */
  get actualStatus(): number {
    return this.item.projectSubContractorStatusId;
  }

  /** Plazo en días calculado desde el formulario (paso 2 en edición). */
  get plazoEnDias(): number | null {
    if (!this.step2Form.startDate || !this.step2Form.endDate) return null;
    const diff = new Date(this.step2Form.endDate).getTime() - new Date(this.step2Form.startDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  /** Plazo en días calculado desde los datos guardados (paso 2 en lectura). */
  get storedPlazoEnDias(): number | null {
    if (!this.item.startDate || !this.item.endDate) return null;
    const diff = new Date(this.item.endDate).getTime() - new Date(this.item.startDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  get forwardLabel(): string {
    if (this.actualStatus === 1) return 'Enviar correos';
    if (this.actualStatus === 2 && this.viewStep === 2) return 'Guardar y continuar';
    return 'Siguiente paso';
  }

  canGoBack(): boolean {
    return this.viewStep > 1;
  }

  canGoForward(): boolean {
    if (this.actualStatus === 1) return true;
    if (this.actualStatus === 2 && this.viewStep === 2) {
      return !!(this.step2Form.signingDate && this.step2Form.startDate && this.step2Form.endDate);
    }
    return this.viewStep < this.actualStatus;
  }

  goBack(): void {
    if (this.viewStep > 1) this.viewStep--;
  }

  goForward(): void {
    if (this.actualStatus === 1) {
      this.sendNotification();
    } else if (this.actualStatus === 2 && this.viewStep === 2) {
      this.saveStep2Dates();
    } else {
      if (this.viewStep < this.actualStatus) this.viewStep++;
    }
  }

  /** Devuelve el archivo subido para un tipo de documento dado (o undefined si no hay). */
  getDocFile(key: string): ProjectSubContractorFileDTO | undefined {
    switch (key) {
      case 'Contract':          return this.item.contract          ?? undefined;
      case 'SummarySheet':      return this.item.summarySheet      ?? undefined;
      case 'Budget':            return this.item.budget            ?? undefined;
      case 'Schedule':          return this.item.schedule          ?? undefined;
      case 'AttachedQuotation': return this.item.attachedQuotation ?? undefined;
      case 'ServiceOrder':      return this.item.serviceOrder      ?? undefined;
      case 'PromissoryNote':    return this.item.promissoryNote    ?? undefined;
      default: return undefined;
    }
  }

  canGenerate(key: string): boolean {
    return this.generableKeys.has(key);
  }

  generateDoc(docKey: string): void {
    this.generatingDoc = docKey;
    this.loaderService.show();
    this.adjudicacionesService.generateDocument(this.item.projectSubContractorId, docKey).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.generatingDoc = null;
        const generated: ProjectSubContractorFileDTO = { fileUrl: res.fileUrl, originalFileName: res.originalFileName };
        switch (docKey) {
          case 'Contract':          this.item.contract          = generated; break;
          case 'SummarySheet':      this.item.summarySheet      = generated; break;
          case 'Budget':            this.item.budget            = generated; break;
          case 'Schedule':          this.item.schedule          = generated; break;
          case 'AttachedQuotation': this.item.attachedQuotation = generated; break;
          case 'ServiceOrder':      this.item.serviceOrder      = generated; break;
          case 'PromissoryNote':    this.item.promissoryNote    = generated; break;
        }
        Swal.fire({ icon: 'success', title: 'Documento generado exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.generatingDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  triggerUpload(docKey: string): void {
    this.currentDocType = docKey;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.currentDocType) return;
    this.uploadDoc(this.currentDocType, input.files[0]);
  }

  private uploadDoc(docType: string, file: File): void {
    this.uploadingDoc = docType;
    this.loaderService.show();
    this.adjudicacionesService.uploadDocument(this.item.projectSubContractorId, docType, file).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.uploadingDoc = null;
        const uploaded: ProjectSubContractorFileDTO = { fileUrl: res.fileUrl, originalFileName: res.originalFileName };
        switch (docType) {
          case 'Contract':          this.item.contract          = uploaded; break;
          case 'SummarySheet':      this.item.summarySheet      = uploaded; break;
          case 'Budget':            this.item.budget            = uploaded; break;
          case 'Schedule':          this.item.schedule          = uploaded; break;
          case 'AttachedQuotation': this.item.attachedQuotation = uploaded; break;
          case 'ServiceOrder':      this.item.serviceOrder      = uploaded; break;
          case 'PromissoryNote':    this.item.promissoryNote    = uploaded; break;
        }
        Swal.fire({ icon: 'success', title: 'Archivo subido exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.uploadingDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  onStatusChange(docKey: string): void {
    this.saveDocStatus(docKey);
  }

  onObservationBlur(docKey: string): void {
    this.saveDocStatus(docKey);
  }

  private saveDocStatus(docKey: string): void {
    const form = this.docForms[docKey];
    this.updatingStatusDoc = docKey;
    this.adjudicacionesService.updateDocumentStatus(
      this.item.projectSubContractorId,
      docKey,
      { statusId: form.statusId, observation: form.observation || null },
    ).subscribe({
      next: () => {
        this.updatingStatusDoc = null;
        // Actualizar el item local para mantener coherencia
        const file = this.getDocFile(docKey);
        if (file) {
          file.statusId    = form.statusId;
          file.observation = form.observation || null;
        }
      },
      error: (err) => {
        this.updatingStatusDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  private async sendNotification(): Promise<void> {
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft. Por favor inicie sesión nuevamente.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendNotification({
      projectSubContractorId: this.item.projectSubContractorId,
      graphAccessToken: graphToken,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Notificación enviada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private saveStep2Dates(): void {
    this.loaderService.show();
    this.adjudicacionesService.saveDates(this.item.projectSubContractorId, {
      signingDate: this.step2Form.signingDate,
      startDate:   this.step2Form.startDate,
      endDate:     this.step2Form.endDate,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Fechas guardadas exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
