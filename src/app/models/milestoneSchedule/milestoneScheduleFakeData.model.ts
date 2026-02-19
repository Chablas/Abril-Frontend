export interface MilestoneScheduleFakeDataDTO {
    milestoneId: number;
    milestoneDescription: string;
    plannedStartDate: Date;
    plannedEndDate: Date | string | null | undefined;
    order: number;
}