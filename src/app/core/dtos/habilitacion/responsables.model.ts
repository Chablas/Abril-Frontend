export interface ResponsableWorkerOptionDTO {
  workerId: number;
  nombreCompleto: string;
  email: string;
}

export interface ResponsableRazonSocialDTO {
  contributorId: number;
  contributorName: string;
  emailAdministrador: string | null;
}

export interface ResponsableProyectoDTO {
  projectId: number;
  projectDescription: string;
  emailCoordAdmin: string | null;
}

export interface ResponsablesDTO {
  razonesSociales: ResponsableRazonSocialDTO[];
  proyectos: ResponsableProyectoDTO[];
  trabajadores: ResponsableWorkerOptionDTO[];
}
