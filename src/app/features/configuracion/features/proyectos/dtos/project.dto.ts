export interface ProjectDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  companyId?: number;
  companyRuc?: string;
  companyName?: string;
  companyAddress?: string;
  district?: string;
  location?: string;
  active: boolean;
}
