export interface CompanyRegisterDTO {
  companyRuc: string;
  companyName: string;
  address?: string;
  economicActivityDescription?: string;
  emails: string[];
  graphAccessToken?: string;
  brochureFile?: File | null;
  fichaRucFile?: File | null;
  referencesListFile?: File | null;
}
