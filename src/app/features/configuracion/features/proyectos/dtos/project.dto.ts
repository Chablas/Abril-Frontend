export interface ProjectDto {
  projectId: number;
  projectDescription: string;
  codigo?: string;
  abbreviation?: string;
  levelDescription?: string;

  /** Qué es: proyecto de verdad, FFT, Oficina Central, área interna o prueba (catálogo project_tipo). */
  projectTipoId: number;
  /** PROYECTO | FFT | OFICINA_CENTRAL | AREA_INTERNA | PRUEBA: decide el color del badge. */
  projectTipoCodigo: string;
  projectTipoNombre: string;

  /** Ciclo de vida (catálogo project_ciclo_vida). No confundir con `active`. */
  projectCicloVidaId: number;
  /** ACTIVO | FINALIZADO | INACTIVO: decide el color del badge. */
  projectCicloVidaCodigo: string;
  projectCicloVidaNombre: string;

  // Contribuyente (read-only en este DTO de listado)
  contributorId?: number;
  contributorRuc?: string;
  contributorName?: string;
  contributorAddress?: string;
  contributorDistrict?: string;
  contributorProvince?: string;
  contributorDepartment?: string;
  contributorLegalEntityRegistryNumber?: string;

  // Ubicación del proyecto
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;

  // Responsable Arq. Comercial
  responsableArqCom?: string;
  responsableArqComId?: number;

  // Responsable UDP
  responsableUdp?: string;
  responsableUdpId?: number;

  // Responsable Planeamiento BIM
  responsablePlaneamientoBim?: string;
  responsablePlaneamientoBimId?: number;

  /** Coordinador administrativo: FK a workers. El correo se resuelve en vivo desde su ficha. */
  workersCoordAdminId?: number | null;
  /** Nombre del coordinador administrativo, para pintarlo sin buscarlo en la lista. */
  coordAdminNombre?: string | null;
  coordAdminEmail?: string | null;

  /** Residente: FK a workers. Nombre y correo vienen resueltos desde su ficha. */
  residenteWorkersId?: number | null;
  residenteNombre?: string | null;
  residenteEmail?: string | null;

  // Correos de aviso (texto)
  emailResponsable?: string | null;
  emailRrhh?: string | null;
  emailCoordSsoma?: string | null;

  // Fechas (ISO string)
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
  /**
   * Si el proyecto participa del módulo Unidad de Proyectos (filtra Cronograma de
   * Actividades, Projects Dashboard y Milestone Schedule en backend). Se actualiza
   * vía `ProyectoService.toggleUnidadDeProyectos()`:
   * PATCH `{apiUrl}api/v1/project/{id}/tiene-unidad-de-proyectos`,
   * respuesta `{ tieneUnidadDeProyectos: boolean }`.
   */
  tieneUnidadDeProyectos?: boolean;

  // Geolocalización (geofencing de Tareo — Arquitectura Comercial)
  lat?: number | null;
  lng?: number | null;
  radioGeofenceMetros?: number;

  /** Columna de sistema: si el proyecto aparece en filtros y desplegables («Visible en el sistema»). */
  active: boolean;
}
