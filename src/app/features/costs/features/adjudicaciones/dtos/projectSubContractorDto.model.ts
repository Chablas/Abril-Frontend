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
  amount: number;
  currencyId: number;
  currencyCode: string;
  amountHasIgv: boolean;
  contractorEmail: string;
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
  // Documentos del contrato (paso 3)
  contract?: ProjectSubContractorFileDTO;
  summarySheet?: ProjectSubContractorFileDTO;
  budget?: ProjectSubContractorFileDTO;
  schedule?: ProjectSubContractorFileDTO;
  attachedQuotation?: ProjectSubContractorFileDTO;
  serviceOrder?: ProjectSubContractorFileDTO;
}
