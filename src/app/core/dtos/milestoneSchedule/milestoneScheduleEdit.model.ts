/**
 * Exclusivo del PUT de editar un hito ya guardado (milestoneSchedule.service.ts#editarHito).
 * A diferencia de MilestoneScheduleCreateDTO (que también usa el POST de crear una versión
 * completa), acá plannedStartDate SÍ admite null — para permitir mover la fecha real de un
 * hito de "inicio" a "fin" (o viceversa) sin recrear la versión entera. La garantía de que
 * "Inicio de obra" siempre tenga fecha ya no la da el tipo del DTO, la valida el backend.
 */
export interface MilestoneScheduleEditDTO {
  milestoneId: number | null;
  customDescription?: string | null;
  order: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  esHitoCritico: boolean;
}
