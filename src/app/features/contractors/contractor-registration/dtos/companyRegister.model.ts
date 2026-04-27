export interface ContributorRegisterDTO {
  contributorRuc: string;
  contributorName: string;
  address?: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  economicActivityDescription?: string;
  emails: string[];
  graphAccessToken?: string;
  brochureFile?: File | null;
  fichaRucFile?: File | null;
  referencesListFile?: File | null;
}
