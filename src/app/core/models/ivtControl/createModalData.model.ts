import { ProjectScheduleSimpleDTO } from "../../dtos/project/projectScheduleSimple.model";
import { IvtControlCreateDTO } from "../../dtos/ivtControl/ivtControlCreate.model";

export interface CreateModalData {
    projectOptions: ProjectScheduleSimpleDTO[];
    createDto: IvtControlCreateDTO;
    selectedFiles: SelectedFile[];
    showImageAdder: boolean;
    periodOptions: { label: string; value: string }[];
}

interface SelectedFile {
  name: string;
  size: string;
  file: File;
}