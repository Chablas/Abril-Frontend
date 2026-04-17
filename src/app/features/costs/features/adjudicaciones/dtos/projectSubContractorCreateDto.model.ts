export interface ProjectSubContractorCreateDTO {
  projectId: number;
  contractorId: number;
  contractId: number;
  contractTypeId: number;
  contractOriginId: number;
  paymentMethodId: number;
  advancePercentage?: number;
  amount: number;
  currencyId: number;
  hasIgv: boolean;
  contractorEmail: string;
  workItemId: number;
  workItemCategoryId: number;
  quotationFiles?: File[];
  comparativeFiles?: File[];
}
