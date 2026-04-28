export interface ProjectSubContractorCreateDTO {
  projectId: number;
  contractorId: number;
  contractId: number;
  contractTypeId: number;
  contractOriginId: number;
  paymentMethodId: number;
  advancePercentage?: number;
  advanceAmount?: number;
  amount: number;
  currencyId: number;
  hasIgv: boolean;
  workItemId: number;
  workItemCategoryId: number;
  quotationFiles?: File[];
  comparativeFiles?: File[];
}
