export interface MilestoneScheduleCreateDTO {
    milestoneId: number;
    plannedStartDate: string;
    plannedEndDate: string | null | undefined;
    order: number;
}