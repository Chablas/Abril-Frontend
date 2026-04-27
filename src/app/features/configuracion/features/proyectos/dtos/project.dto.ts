export interface ProjectDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  contributorRuc?: string;
  contributorName?: string;
  contributorAddress?: string;
  contributorDistrict?: string;
  contributorProvince?: string;
  contributorDepartment?: string;
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;
  active: boolean;
}
