export interface LessonReminderDTO {
  userProjectId: number;
  workerId: number;
  workerFullName?: string;
  email?: string;
  projectId: number;
  projectDescription?: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
}

export interface LessonReminderPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: LessonReminderDTO[];
}

export interface ToggleLessonReminderResultDTO {
  userProjectId: number;
  active: boolean;
}
