import { UserPersonFilterDTO } from "../user/userPersonFilter.model";
import { ProjectFilterDTO } from "../project/projectFilter.model";

export interface UserProjectCreateDataDTO {
    userPersons: UserPersonFilterDTO[];
    projects: ProjectFilterDTO[];
}