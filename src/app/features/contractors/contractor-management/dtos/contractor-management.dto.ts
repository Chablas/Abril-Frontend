export interface ContractorUserItemDTO {
  userId: number;
  email: string;
  createdDateTime: string;
}

export interface ContractorEmailItemDTO {
  contractorEmailId: number | null;
  email: string;
  active: boolean;
}

export interface ContractorManagementDTO {
  contractorId: number;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  legalRepresentativeDni?: string | null;
  legalRepresentativeFullName?: string | null;
  legalEntityRegistryNumber?: string | null;
  contributorEconomicActivityDescription: string;
  contractorStateId: number;
  contractorStateDescription: string;
  createdDateTime: string;
  emails: string[];
  emailDetails: ContractorEmailItemDTO[];
  hasUser?: boolean;
  users: ContractorUserItemDTO[];
  logoFileUrl?: string | null;
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
}
