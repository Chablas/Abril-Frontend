import { ProjectEstado } from './project.model';

export interface ProjectEditDTO {
    projectId: number;
    projectDescription: string;
    projectCode?: string | null;
    companyId?: number | null;
    estado?: ProjectEstado | null;
    responsable?: string | null;
    emailResidente?: string | null;
    emailResponsable?: string | null;
    emailRrhh?: string | null;
    emailCoordSsoma?: string | null;
    emailCoordAdmin?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    areaM2?: number | null;
    active: boolean;
}
