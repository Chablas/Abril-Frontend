export interface ContractorManagementDTO {
  companyId: number;
  companyRuc: string;
  companyName: string;
  companyAddress: string;
  companyEconomicActivityDescription: string;
  companyStateId: number;
  companyStateDescription: string;
  createdDateTime: string;
  emails: string[];
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
}
