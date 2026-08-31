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

/**
 * Residente y Coordinador Administrativo son FKs a workers: su correo se resuelve en vivo
 * desde la ficha del trabajador. Responsable, RR.HH. y Coord. SSOMA siguen siendo correos
 * de texto guardados en el proyecto.
 */
export interface ResponsableProyectoDTO {
  projectId: number;
  projectDescription: string;
  residenteWorkersId: number | null;
  residenteNombre: string | null;
  residenteEmail: string | null;
  workersCoordAdminId: number | null;
  coordAdminNombre: string | null;
  coordAdminEmail: string | null;
  emailResponsable: string | null;
  emailRrhh: string | null;
  emailCoordSsoma: string | null;
}

export interface ResponsableProyectoUpdateDTO {
  residenteWorkersId: number | null;
  workersCoordAdminId: number | null;
  emailResponsable: string | null;
  emailRrhh: string | null;
  emailCoordSsoma: string | null;
}

export interface ResponsablesDTO {
  razonesSociales: ResponsableRazonSocialDTO[];
  proyectos: ResponsableProyectoDTO[];
  trabajadores: ResponsableWorkerOptionDTO[];
}
