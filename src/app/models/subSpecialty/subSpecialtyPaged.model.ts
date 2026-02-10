import { SubSpecialtyGetDTO } from "../subSpecialty/subSpecialty.model";

export interface SubSpecialtyPagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: SubSpecialtyGetDTO[];
}