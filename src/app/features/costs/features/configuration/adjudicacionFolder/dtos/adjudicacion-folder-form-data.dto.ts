export interface ProjectSimpleDto {
  projectId: number;
  projectDescription: string;
}

export interface AdjudicacionFolderFormDataDto {
  projects: ProjectSimpleDto[];
}
