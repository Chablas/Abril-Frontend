import { MilestoneScheduleCreateDTO } from "../milestoneSchedule/milestoneScheduleCreate.model";

export interface MilestoneScheduleHistoryCreateDTO {
    scheduleId: number;
    milestoneSchedules: MilestoneScheduleCreateDTO[];
    forceSave: boolean; // fuerza el guardado en caso se de click al boton guardar sin cambios y que el endpoint se saltee la logica de detectar cambios
}