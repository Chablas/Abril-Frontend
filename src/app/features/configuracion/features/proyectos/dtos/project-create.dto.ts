export interface ProjectCreateDto {
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  district?: string;
  location?: string;
  active: boolean;
}
