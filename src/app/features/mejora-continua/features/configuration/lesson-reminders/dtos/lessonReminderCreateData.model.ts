export interface LessonReminderUserDTO {
  userId: number;
  fullName?: string;
}

export interface LessonReminderProjectDTO {
  projectId: number;
  projectDescription?: string;
}

export interface LessonReminderCreateDataDTO {
  users: LessonReminderUserDTO[];
  projects: LessonReminderProjectDTO[];
}
