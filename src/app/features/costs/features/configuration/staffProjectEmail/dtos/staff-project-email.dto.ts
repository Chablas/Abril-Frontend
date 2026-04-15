export interface StaffProjectEmailDto {
  staffProjectEmailId: number;
  projectId: number;
  projectName: string;
  email: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}
