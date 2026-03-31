export interface ProjectSubContractorCreateDTO {
  projectId: number;
  companyId: number;
  contractId: number;
  contractTypeId: number;
  contractOriginId: number;
  paymentMethodId: number;
  amount: number;
  currencyId: number;
  hasIgv: boolean;
  contractorEmail: string;
  workItemId: number;
  quotationFiles?: File[];
  comparativeFiles?: File[];
}