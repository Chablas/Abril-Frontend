export interface ProjectSubContractorCreateDTO {
  projectId: number;
  contractorId: number;
  contractTypeId: number;
  contractModalityId?: number | null;
  paymentMethodId: number;
  paymentFormId?: number | null;
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
