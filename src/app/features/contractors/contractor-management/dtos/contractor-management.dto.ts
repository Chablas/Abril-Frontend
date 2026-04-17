export interface ContractorManagementDTO {
  contractorId: number;
  companyId: number;
  companyRuc: string;
  companyName: string;
  companyAddress: string;
  companyEconomicActivityDescription: string;
  contractorStateId: number;
  contractorStateDescription: string;
  createdDateTime: string;
  emails: string[];
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
}
