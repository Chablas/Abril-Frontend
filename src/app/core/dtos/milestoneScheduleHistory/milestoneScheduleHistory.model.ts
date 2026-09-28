export interface MilestoneScheduleHistoryGetDTO {
    milestoneScheduleHistoryId : number;
    scheduleId: number;
    createdDateTime: string;
    createdUserId: number;
    /** Trabajador que subió la versión; null si no se sabe (se muestra "—"). */
    createdUserFullName?: string | null;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}