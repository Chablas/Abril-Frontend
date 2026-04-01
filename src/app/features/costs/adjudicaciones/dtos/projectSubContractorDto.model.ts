export interface ProjectSubContractorDTO {
  projectSubContractorId: number;
  projectId: number;
  projectDescription: string;
  companyId: number;
  companyName: string;
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
  createdDateTime: string;
  quotationFileUrls: string[];
  comparativeFileUrls: string[];
  projectSubContractorStatusId: number;
  projectSubContractorStatusDescription: string;
}
