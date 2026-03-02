import { ProjectSimpleDTO } from "../dtos/project/projectSimple.model";
import { IvtControlCreateDTO } from "../dtos/ivtControl/ivtControlCreate.model";

export interface CreateModalData {
    projectOptions: ProjectSimpleDTO[];
    createDto: IvtControlCreateDTO;
}