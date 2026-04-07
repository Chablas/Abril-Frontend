export interface CompanyRegisterDTO {
  companyRuc: string;
  companyName: string;
  address?: string;
  economicActivityDescription?: string;
  emails: string[];
}
