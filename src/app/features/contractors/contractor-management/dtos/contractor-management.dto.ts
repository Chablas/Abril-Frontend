export interface ContractorManagementDTO {
  contractorId: number;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contractorStateId: number;
  contractorStateDescription: string;
  createdDateTime: string;
  emails: string[];
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
}
