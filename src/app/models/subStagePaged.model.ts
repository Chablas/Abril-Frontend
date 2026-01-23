import { SubStageGetDTO } from "./subStage.model";

export interface SubStagePagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: SubStageGetDTO[];
}