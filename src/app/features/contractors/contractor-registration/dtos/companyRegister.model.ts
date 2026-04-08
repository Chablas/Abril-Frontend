export interface CompanyRegisterDTO {
  companyRuc: string;
  companyName: string;
  companyAddress?: string;
  companyEconomicActivityDescription?: string;
  companyEmails: string[];
}
