import { UserProjectGetDTO } from "./userProject.model";

export interface UserProjectPagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: UserProjectGetDTO[];
}