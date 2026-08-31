export interface ProjectCreateDto {
  projectDescription: string;
  codigo?: string;
  abbreviation?: string;
  levelDescription?: string;
  estado?: string;

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
