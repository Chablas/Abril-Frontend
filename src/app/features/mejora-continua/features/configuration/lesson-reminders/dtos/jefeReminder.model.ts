export interface JefeReminderConfigItemDTO {
  lessonJefeReminderId: number | null;
  workerId: number;
  fullName?: string;
  email?: string;
  categoria?: string; // Jefe | Coordinador | Residente
  active: boolean;
}

export interface ToggleJefeReminderResultDTO {
  lessonJefeReminderId: number;
  active: boolean;
}
