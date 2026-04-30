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
  contractId: number;
  contractDescription: string;
  contractTypeId: number;
  contractTypeDescription: string;
  contractOriginId: number;
  contractOriginDescription: string;
  paymentMethodId: number;
  paymentMethodDescription: string;
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
  quotationFiles: ProjectSubContractorFileDTO[];
  comparativeFiles: ProjectSubContractorFileDTO[];
  projectSubContractorStatusId: number;
  projectSubContractorStatusDescription: string;
  signingDate?: string;
  startDate?: string;
  endDate?: string;
  contractNumber?: number | null;
  promissoryNoteNumber?: number | null;
  arrivedWithObservations?: boolean | null;
  // Documentos del contrato (paso 3)
  contract?: ProjectSubContractorFileDTO;
  summarySheet?: ProjectSubContractorFileDTO;
  budget?: ProjectSubContractorFileDTO;
  schedule?: ProjectSubContractorFileDTO;
  attachedQuotation?: ProjectSubContractorFileDTO;
  serviceOrder?: ProjectSubContractorFileDTO;
  promissoryNote?: ProjectSubContractorFileDTO;  // solo si paymentMethodId === 2
  // Documentos escaneados (paso 7)
  scannedDoc1?: ProjectSubContractorFileDTO;
  scannedDoc2?: ProjectSubContractorFileDTO;
  scannedDoc3?: ProjectSubContractorFileDTO;
}
