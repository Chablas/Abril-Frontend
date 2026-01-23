import { AreaGetDTO } from "./area.model";
import { ProjectGetDTO } from "./project.model";

export interface LessonFiltersDTO {
    projects: ProjectGetDTO[];
    areas: AreaGetDTO[];
}