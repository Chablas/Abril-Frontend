export interface JefeReminderConfigItemDTO {
  lessonJefeReminderId: number | null;
  workerId: number;
  fullName?: string;
  email?: string;
  active: boolean;
}

export interface ToggleJefeReminderResultDTO {
  lessonJefeReminderId: number;
  active: boolean;
}
