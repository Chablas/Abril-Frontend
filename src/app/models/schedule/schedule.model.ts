export interface ScheduleGetDTO {
    scheduleId : number;
    scheduleDescription: string;
    projectId: number;
    projectDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}