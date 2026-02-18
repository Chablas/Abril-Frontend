export interface MilestoneScheduleCreateDTO {
    milestoneId: number;
    milestoneScheduleHistoryId: number;
    plannedStartDate: Date;
    plannedEndDate: Date | string | null | undefined;
    order: number;
}