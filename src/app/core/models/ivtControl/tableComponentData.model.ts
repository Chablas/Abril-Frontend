import { ProjectScheduleSimpleDTO } from "../../dtos/project/projectScheduleSimple.model";
import { IvtControlCreateDTO } from "../../dtos/ivtControl/ivtControlCreate.model";
import { IvtControlGetDTO } from "../../dtos/ivtControl/ivtControlGet.model";
import { SafeResourceUrl } from "@angular/platform-browser";

export interface TableComponentData {
    tableData: IvtControlGetDTO[];
    iframeUrl: SafeResourceUrl | null;
}