export interface MilestoneScheduleFakeDataDTO {
    milestoneId: number;
    milestoneDescription: string;
    plannedStartDate: string;
    plannedEndDate: string | null | undefined;
    order: number;
    esObligatorio: boolean;
    esPuntual: boolean;
}