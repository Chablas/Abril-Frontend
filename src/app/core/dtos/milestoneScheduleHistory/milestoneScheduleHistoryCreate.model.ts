import { MilestoneScheduleCreateDTO } from "../milestoneSchedule/milestoneScheduleCreate.model";

export interface MilestoneScheduleHistoryCreateDTO {
    projectId: number;
    milestoneSchedules: MilestoneScheduleCreateDTO[];
    forceSave: boolean; // fuerza el guardado en caso se de click al boton guardar sin cambios y que el endpoint se saltee la logica de detectar cambios
    confirmarHitosSinFecha?: boolean; // confirma el guardado pese a haber hitos sin plannedEndDate (independiente de forceSave)
}