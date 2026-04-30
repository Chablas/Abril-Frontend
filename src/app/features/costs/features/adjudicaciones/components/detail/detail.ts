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

  @ViewChild('fileInput')       fileInput!:       ElementRef<HTMLInputElement>;
  @ViewChild('fileInputStep4')  fileInputStep4!:  ElementRef<HTMLInputElement>;
  @ViewChild('fileInputStep7')  fileInputStep7!:  ElementRef<HTMLInputElement>;

  readonly steps = [
    'Por notificar',
    'Datos del contrato',
    'Preparación de documentos',
    'Por enviar al SC',
    'Llegada a Of. Central',
    'Procesos de firma',
    'Por escanear',
    'Envío a obra',
    'Completado',
  ];

  readonly totalSteps = this.steps.length;

  /** Paso que se está mostrando en pantalla (navegable). */
  viewStep = 1;

  /** Formulario del paso 2. */
  step2Form = { signingDate: '', startDate: '', endDate: '', contractNumber: null as number | null, promissoryNoteNumber: null as number | null };

  /** Documentos del paso 3. Se inicializa una sola vez en ngOnInit para evitar re-renders. */
  documents: { key: string; label: string }[] = [];

  /** Documentos del paso 7 (1 slot). */
  readonly scannedDocuments: { key: string; label: string }[] = [
    { key: 'ScannedDoc1', label: 'Documento escaneado' },
  ];

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

  /** Paso 4 — archivo en memoria hasta que se envía */
  step4File: File | null = null;

  /** Paso 7 — clave de doc de escaneados siendo subido en este momento */
  currentScannedDocType: string | null = null;

  /** Paso 5 — opción de llegada y subsanación */
  step5ArrivalOption: 'complete' | 'with_observations' | null = null;
  step5ObservationsResolved = false;

  /** Paso 6 — confirmación de firmas */
  step6ConfirmedOriundo = false;
  step6ConfirmedToratto = false;
  step6ConfirmedCostos  = false;
  get step6AllConfirmed(): boolean { return this.step6ConfirmedOriundo && this.step6ConfirmedToratto && this.step6ConfirmedCostos; }

  currentDocType: string | null = null;
  uploadingDoc: string | null = null;
  generatingDoc: string | null = null;
  updatingStatusDoc: string | null = null;

  /** Opciones fijas de estado para los documentos. */
  readonly fileStatuses = [
    { id: 1, label: 'No aplica' },
    { id: 2, label: 'En revisión por Ofic. Centr.' },
    { id: 3, label: 'Con observaciones' },
    { id: 4, label: 'Aprobado' },
  ] as const;

  /** Formulario local de estado/observación por clave de documento. */
  docForms: Record<string, { statusId: number | null; observation: string }> = {};

  /** Tipos de documento que ya tienen generación implementada en el backend. */
  private readonly generableKeys = new Set(['SummarySheet', 'Contract', 'Budget', 'PromissoryNote']);

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private microsoftAuthService: MicrosoftAuthService,
  ) {}

  ngOnInit(): void {
    this.viewStep = this.item.projectSubContractorStatusId;
    if (this.item.signingDate)    this.step2Form.signingDate    = this.item.signingDate.substring(0, 10);
    if (this.item.startDate)      this.step2Form.startDate      = this.item.startDate.substring(0, 10);
    if (this.item.endDate)        this.step2Form.endDate        = this.item.endDate.substring(0, 10);
    if (this.item.contractNumber)        this.step2Form.contractNumber        = this.item.contractNumber;
    if (this.item.promissoryNoteNumber)  this.step2Form.promissoryNoteNumber  = this.item.promissoryNoteNumber;
    this.documents = this.buildDocuments();
    this.initDocForms();
    if (this.item.projectSubContractorStatusId >= 5 && this.item.arrivedWithObservations != null) {
      this.step5ArrivalOption = this.item.arrivedWithObservations ? 'with_observations' : 'complete';
    }
    this.step6ConfirmedOriundo  = this.item.projectSubContractorStatusId > 6;
    this.step6ConfirmedToratto  = this.item.projectSubContractorStatusId > 6;
    this.step6ConfirmedCostos   = this.item.projectSubContractorStatusId > 6;
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

  /** True cuando al menos un documento escaneado ha sido subido. */
  get hasAnyScannedDoc(): boolean {
    return this.scannedDocuments.some(doc => !!this.getDocFile(doc.key));
  }

  /** True cuando todos los documentos que tienen archivo subido tienen statusId === 4 (Aprobado). */
  get allDocsApproved(): boolean {
    const docsWithFile = this.documents.filter(doc => !!this.getDocFile(doc.key));
    return docsWithFile.length > 0 &&
           docsWithFile.every(doc => this.docForms[doc.key]?.statusId === 4);
  }

  get forwardLabel(): string {
    if (this.actualStatus === 1) return 'Enviar correos';
    if (this.actualStatus === 2 && this.viewStep === 2) return 'Guardar y continuar';
    if (this.actualStatus === 3 && this.viewStep === 3) return 'Marcar como aprobado';
    if (this.actualStatus === 4 && this.viewStep === 4) return 'Enviar al SC';
    if (this.actualStatus === 5 && this.viewStep === 5) return 'Confirmar recepción';
    if (this.actualStatus === 6 && this.viewStep === 6) return 'Confirmar y enviar correo';
    if (this.actualStatus === 7 && this.viewStep === 7) return 'Marcar como escaneado';
    if (this.actualStatus === 8 && this.viewStep === 8) return 'Enviar a Oficina Técnica';
    return 'Siguiente paso';
  }

  canGoBack(): boolean {
    return this.viewStep > 1;
  }

  canGoForward(): boolean {
    if (this.actualStatus === 1) return true;
    if (this.actualStatus === 2 && this.viewStep === 2) {
      const baseOk = !!(this.step2Form.signingDate && this.step2Form.startDate && this.step2Form.endDate && this.step2Form.contractNumber != null && (this.step2Form.contractNumber as any) !== '');
      if (!baseOk) return false;
      if (this.item.paymentMethodId === 2) {
        return this.step2Form.promissoryNoteNumber != null && (this.step2Form.promissoryNoteNumber as any) !== '';
      }
      return true;
    }
    if (this.actualStatus === 3 && this.viewStep === 3) {
      return this.allDocsApproved;
    }
    if (this.actualStatus === 4 && this.viewStep === 4) {
      return this.step4File !== null;
    }
    if (this.actualStatus === 5 && this.viewStep === 5) {
      if (this.step5ArrivalOption === 'complete') return true;
      if (this.step5ArrivalOption === 'with_observations') return this.step5ObservationsResolved;
      return false;
    }
    if (this.actualStatus === 6 && this.viewStep === 6) {
      return this.step6AllConfirmed;
    }
    if (this.actualStatus === 7 && this.viewStep === 7) {
      return this.hasAnyScannedDoc;
    }
    if (this.actualStatus === 8 && this.viewStep === 8) {
      return true;
    }
    return this.viewStep < this.actualStatus;
  }

  goToStep(step: number): void {
    if (step <= this.actualStatus) this.viewStep = step;
  }

  goBack(): void {
    if (this.viewStep > 1) this.viewStep--;
  }

  goForward(): void {
    if (this.actualStatus === 1) {
      this.sendNotification();
    } else if (this.actualStatus === 2 && this.viewStep === 2) {
      this.saveStep2Dates();
    } else if (this.actualStatus === 3 && this.viewStep === 3) {
      this.advanceToApproved();
    } else if (this.actualStatus === 4 && this.viewStep === 4) {
      this.sendScNotification();
    } else if (this.actualStatus === 5 && this.viewStep === 5) {
      this.confirmStep5();
    } else if (this.actualStatus === 6 && this.viewStep === 6) {
      this.sendStep6Notification();
    } else if (this.actualStatus === 7 && this.viewStep === 7) {
      this.advanceFromStep7();
    } else if (this.actualStatus === 8 && this.viewStep === 8) {
      this.sendStep8Notification();
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
      case 'ScannedDoc1':       return this.item.scannedDoc1       ?? undefined;
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
          case 'ScannedDoc1':       this.item.scannedDoc1       = generated; break;
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
          case 'ScannedDoc1':       this.item.scannedDoc1       = uploaded; break;
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
    this.loaderService.show();
    this.adjudicacionesService.updateDocumentStatus(
      this.item.projectSubContractorId,
      docKey,
      { statusId: form.statusId, observation: form.observation || null },
    ).subscribe({
      next: () => {
        this.loaderService.hide();
        this.updatingStatusDoc = null;
        // Actualizar el item local para mantener coherencia
        const file = this.getDocFile(docKey);
        if (file) {
          file.statusId    = form.statusId;
          file.observation = form.observation || null;
        }
      },
      error: (err) => {
        this.loaderService.hide();
        this.updatingStatusDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  onStep4FileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.step4File = input.files[0];
  }

  private async sendScNotification(): Promise<void> {
    if (!this.step4File) return;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendScNotification(
      this.item.projectSubContractorId,
      this.step4File,
      graphToken,
    ).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 5;
        this.viewStep = 5;
        this.step4File = null;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado al subcontratista', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
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
        this.item.projectSubContractorStatusId = 2;
        this.viewStep = 2;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Notificación enviada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private async sendStep6Notification(): Promise<void> {
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendStep6Notification(
      this.item.projectSubContractorId,
      graphToken,
    ).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 7;
        this.viewStep = 7;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Correo de proceso de firma enviado', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onArrivalOptionChange(option: 'complete' | 'with_observations'): void {
    this.step5ArrivalOption = option;
    this.step5ObservationsResolved = false;
    this.adjudicacionesService.setArrivalOption(this.item.projectSubContractorId, option === 'with_observations').subscribe({
      next: () => {
        this.item.arrivedWithObservations = option === 'with_observations';
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private confirmStep5(): void {
    const arrivedWithObservations = this.step5ArrivalOption === 'with_observations';
    this.loaderService.show();
    this.adjudicacionesService.confirmStep5(this.item.projectSubContractorId, arrivedWithObservations).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 6;
        this.item.arrivedWithObservations = arrivedWithObservations;
        this.viewStep = 6;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Recepción confirmada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private advanceToApproved(): void {
    this.loaderService.show();
    this.adjudicacionesService.advanceToStep4(this.item.projectSubContractorId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 4;
        this.viewStep = 4;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Adjudicación aprobada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  triggerUploadScanned(docKey: string): void {
    this.currentScannedDocType = docKey;
    this.fileInputStep7.nativeElement.value = '';
    this.fileInputStep7.nativeElement.click();
  }

  onFileSelectedScanned(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.currentScannedDocType) return;
    this.uploadDoc(this.currentScannedDocType, input.files[0]);
  }

  private async sendStep8Notification(): Promise<void> {
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendStep8Notification(
      this.item.projectSubContractorId,
      graphToken,
    ).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 9;
        this.viewStep = 9;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado a Oficina Técnica', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private advanceFromStep7(): void {
    this.loaderService.show();
    this.adjudicacionesService.updateStatus(this.item.projectSubContractorId, 8).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 8;
        this.viewStep = 8;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Documentos escaneados confirmados', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private saveStep2Dates(): void {
    // Coerce: el input[type=number] puede entregar string vacío; convertir a null o número entero
    const rawNum = this.step2Form.contractNumber;
    const contractNumber: number | null =
      rawNum === null || rawNum === undefined || (rawNum as any) === ''
        ? null
        : Math.trunc(Number(rawNum));

    const rawPn = this.step2Form.promissoryNoteNumber;
    const promissoryNoteNumber: number | null =
      rawPn === null || rawPn === undefined || (rawPn as any) === ''
        ? null
        : Math.trunc(Number(rawPn));

    // Validar obligatorio
    if (contractNumber === null) {
      Swal.fire({ icon: 'warning', title: 'El número de contrato es obligatorio.', draggable: true });
      return;
    }

    // Validar rango int32
    if (contractNumber < 0 || contractNumber > 2_147_483_647) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de contrato inválido',
        text: 'El número de contrato debe ser un entero positivo menor a 2,147,483,647.',
        draggable: true,
      });
      return;
    }

    if (this.item.paymentMethodId === 2 && promissoryNoteNumber === null) {
      Swal.fire({ icon: 'warning', title: 'El número de pagaré es obligatorio.', draggable: true });
      return;
    }

    if (promissoryNoteNumber !== null && (promissoryNoteNumber < 0 || promissoryNoteNumber > 2_147_483_647)) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de pagaré inválido',
        text: 'El número de pagaré debe ser un entero positivo menor a 2,147,483,647.',
        draggable: true,
      });
      return;
    }

    this.loaderService.show();
    this.adjudicacionesService.saveDates(this.item.projectSubContractorId, {
      signingDate:    this.step2Form.signingDate,
      startDate:      this.step2Form.startDate,
      endDate:        this.step2Form.endDate,
      contractNumber,
      promissoryNoteNumber,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 3;
        this.item.signingDate          = this.step2Form.signingDate;
        this.item.startDate            = this.step2Form.startDate;
        this.item.endDate              = this.step2Form.endDate;
        this.item.contractNumber       = contractNumber;
        this.item.promissoryNoteNumber = promissoryNoteNumber;
        this.viewStep = 3;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Fechas guardadas exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
