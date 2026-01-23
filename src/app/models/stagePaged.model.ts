import { StageGetDTO } from "./stage.model";

export interface StagePagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: StageGetDTO[];
}