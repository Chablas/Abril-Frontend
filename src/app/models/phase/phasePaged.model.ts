import { PhaseGetDTO } from "../phase/phase.model";

export interface PhasePagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: PhaseGetDTO[];
}