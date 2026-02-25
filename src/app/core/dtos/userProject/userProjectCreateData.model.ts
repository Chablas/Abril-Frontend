import { UserPersonFilterDTO } from "../user/userPersonFilter.model";
import { ProjectSimpleDTO } from "../project/projectSimple.model";

export interface UserProjectCreateDataDTO {
    userPersons: UserPersonFilterDTO[];
    projects: ProjectSimpleDTO[];
}