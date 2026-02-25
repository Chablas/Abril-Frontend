export interface MilestoneScheduleGetDTO {
    milestoneScheduleId: number;
    milestoneId: number;
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
}