/**
 * Agregar un único hito nuevo a una MilestoneScheduleHistory ya existente (cronograma ya
 * guardado), sin subir una versión completa nueva (milestoneSchedule.service.ts#agregarHito).
 * El order se calcula server-side (siguiente disponible), no lo manda el cliente.
 */
export interface MilestoneScheduleAddDTO {
  /** Del catálogo. Null si es un hito personalizado (ver customDescription). */
  milestoneId: number | null;
  customDescription?: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  esHitoCritico: boolean;
}
