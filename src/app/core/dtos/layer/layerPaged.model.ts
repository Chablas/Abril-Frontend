import { LayerGetDTO } from "./layer.model";

export interface LayerPagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: LayerGetDTO[];
}