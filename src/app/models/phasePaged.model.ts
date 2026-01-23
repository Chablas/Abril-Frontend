import { PhaseGetDTO } from "./phase.model";

export interface PhasePagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: PhaseGetDTO[];
}