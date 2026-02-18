import { MilestoneScheduleCreateDTO } from "../milestoneSchedule/milestoneScheduleCreate.model";

export interface MilestoneScheduleHistoryCreateDTO {
    scheduleId: number;
    milestoneSchedules: MilestoneScheduleCreateDTO[];
}