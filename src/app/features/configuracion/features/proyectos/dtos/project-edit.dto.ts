export interface ProjectEditDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  district?: string;
  location?: string;
  active: boolean;
}
