export interface ProjectEditDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  companyId?: number;
  district?: string;
  location?: string;
  active: boolean;
}
