export interface MilestoneScheduleGetDTO {
    milestoneScheduleId: number;
    milestoneId: number | null;
    milestoneDescription: string;
    milestoneScheduleHistoryId: number;
    order: number;
    plannedStartDate: string;
    plannedEndDate: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
    esHitoCritico: boolean;
    /** Del catálogo Milestone: true si el hito exige sí o sí PlannedEndDate (salvo "Inicio de obra"). */
    esObligatorio: boolean;
    /** Del catálogo Milestone: true si el hito es de una sola fecha de cumplimiento (no un rango). Presente en la respuesta del backend (MilestoneScheduleDTO) pero no usado hasta ahora en el frontend. */
    esPuntual?: boolean;
    fechaRealFin?: string | null;
}