export interface ProjectSubContractorFileDTO {
  fileUrl: string;
  originalFileName?: string;
  statusId?: number | null;
  statusDescription?: string | null;
  observation?: string | null;
}

export interface ProjectSubContractorDTO {
  projectSubContractorId: number;
  projectId: number;
  projectDescription: string;
  contractorId: number;
  contributorId: number;
  contributorName: string;
  contractTypeId: number;
  contractTypeDescription: string;
  contractModalityId?: number | null;
  contractModalityDescription?: string | null;
  paymentMethodId: number;
  paymentMethodDescription: string;
  paymentFormId?: number | null;
  paymentFormDescription?: string | null;
  advancePercentage?: number;
  advanceAmount?: number | null;
  termDays?: number | null;
  amount: number;
  currencyId: number;
  currencyCode: string;
  amountHasIgv: boolean;
  contractorEmails: string[];
  workItemId: number;
  workItemDescription: string;
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  createdDateTime: string;
  createdUserFullName?: string;
  quotationFiles: ProjectSubContractorFileDTO[];
  comparativeFiles: ProjectSubContractorFileDTO[];
  projectSubContractorStatusId: number;
  projectSubContractorStatusDescription: string;
  signingDate?: string;
  startDate?: string;
  endDate?: string;
  contractNumber?: number | null;
  promissoryNoteNumber?: number | null;
  guaranteeFundPercentage?: number | null;
  guaranteeFundDays?: number | null;
  guaranteeValidityDays?: number | null;
  arrivedWithObservations?: boolean | null;
  // Documentos del contrato (paso 3)
  contract?: ProjectSubContractorFileDTO;
  summarySheet?: ProjectSubContractorFileDTO;
  budget?: ProjectSubContractorFileDTO;
  schedule?: ProjectSubContractorFileDTO;
  attachedQuotation?: ProjectSubContractorFileDTO;
  serviceOrder?: ProjectSubContractorFileDTO;
  promissoryNote?: ProjectSubContractorFileDTO;  // solo si paymentMethodId === 2
  // Paquete del contrato completo (paso 4 — autogenerado: Hoja Resumen + Contrato + Pagaré)
  package?: ProjectSubContractorFileDTO;
  // Instructivo (paso 3 — obtenido desde OneDrive de Calidad)
  instructivo?: ProjectSubContractorFileDTO;
  // Salidas no conforme y cuadro de tolerancias (paso 3 — solo subida)
  nonConformingOutput?: ProjectSubContractorFileDTO;
  toleranceChart?: ProjectSubContractorFileDTO;
  finishProtection?: ProjectSubContractorFileDTO;
  // Ficha técnica y anexos (paso 3 — solo subida)
  fichaTecnica?: ProjectSubContractorFileDTO;
  anexo?: ProjectSubContractorFileDTO;
  // Documentos escaneados (paso 7)
  scannedDoc1?: ProjectSubContractorFileDTO;
  scannedDoc2?: ProjectSubContractorFileDTO;
  scannedDoc3?: ProjectSubContractorFileDTO;
}
