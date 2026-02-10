import { StageGetDTO } from "../stage/stage.model";

export interface StagePagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: StageGetDTO[];
}