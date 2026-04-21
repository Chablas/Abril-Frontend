export interface ProjectDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  contributorRuc?: string;
  contributorName?: string;
  contributorAddress?: string;
  district?: string;
  location?: string;
  active: boolean;
}
