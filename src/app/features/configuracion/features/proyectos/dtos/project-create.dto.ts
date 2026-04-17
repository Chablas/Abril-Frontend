export interface ProjectCreateDto {
  projectDescription: string;
  levelDescription?: string;
  companyId?: number;
  district?: string;
  location?: string;
  active: boolean;
}
