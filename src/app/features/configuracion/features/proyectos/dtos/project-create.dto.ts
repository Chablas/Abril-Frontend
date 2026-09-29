export interface ProjectCreateDto {
  projectDescription: string;
  codigo?: string;
  abbreviation?: string;
  levelDescription?: string;
  /** Catálogo project_tipo. Sin valor, el backend pone PROYECTO. */
  projectTipoId?: number | null;
  /** Catálogo project_ciclo_vida. Sin valor, el backend pone ACTIVO. */
  projectCicloVidaId?: number | null;

  // Contribuyente
  contributorId?: number;
  legalEntityRegistryNumber?: string;

  // Ubicación del proyecto
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;

  // Responsable
  responsableArqCom?: string;
  responsableArqComId?: number;
  responsableUdp?: string;
  responsableUdpId?: number;

  /** Coordinador administrativo: FK a workers (project.workers_coord_admin_id). */
  workersCoordAdminId?: number | null;

  /**
   * Residente: FK a workers (project.residente_workers_id). El backend lo ignora si quien guarda
   * no puede asignarlo (ROLES_ASIGNAN_RESIDENTE).
   */
  residenteWorkersId?: number | null;

  // Correos de aviso: vacío deja el campo en blanco.
  emailResponsable?: string | null;
  emailRrhh?: string | null;
  emailCoordSsoma?: string | null;

  // Fechas (formato YYYY-MM-DD)
  fechaInicio?: string;
  fechaFin?: string;
  inicioObra?: string;
  finObra?: string;

  // Métricas físicas
  numNiveles?: string;
  numSotanos?: string;
  pisos?: string;
  tiempoConstruccion?: number;
  areaM2?: number;
  areaTechadaM2?: number;
  hhTotalCasa?: number;
  cantTrabajadoresCasa?: string;

  // Flags
  tieneArquitecturaComercial?: boolean;

  active: boolean;
}
