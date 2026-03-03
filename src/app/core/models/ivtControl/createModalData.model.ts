import { ProjectScheduleSimpleDTO } from "../../dtos/project/projectScheduleSimple.model";
import { IvtControlCreateDTO } from "../../dtos/ivtControl/ivtControlCreate.model";

export interface CreateModalData {
    projectOptions: ProjectScheduleSimpleDTO[];
    createDto: IvtControlCreateDTO;
    selectedFileName: string | null;
    selectedFileSize: string | null;
    showImageAdder: boolean;
}