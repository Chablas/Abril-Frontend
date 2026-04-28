export interface ProjectEditDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string;
  contributorId?: number;
  legalEntityRegistryNumber?: string;
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;
  active: boolean;
}
