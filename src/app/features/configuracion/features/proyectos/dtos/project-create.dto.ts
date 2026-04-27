export interface ProjectCreateDto {
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;
  active: boolean;
}
