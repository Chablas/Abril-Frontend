export interface CatalogoDTO {
  id: number;
  descripcion: string;
}

export interface ProyectoFiltroDTO {
  projectId: number;
  projectDescription: string;
}

/** Trabajador de Abril (workers con email_corporativo @abril.pe) para los desplegables. */
export interface TrabajadorAbrilDTO {
  workerId: number;
  fullName: string;
  /** Nombre del puesto del trabajador (catálogo `puesto`). */
  cargo: string | null;
}

export interface PagedResultDTO<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface ReunionListItemDTO {
  reunionId: number;
  projectId: number;
  projectDescription: string;
  numero: number;
  tema: string;
  lugar: string | null;
  fecha: string; // YYYY-MM-DD
  horaInicio: string | null; // HH:mm:ss
  horaFin: string | null;
  reunionEstadoId: number;
  reunionEstado: string;
  totalAcuerdos: number;
  acuerdosCumplidos: number;
  vecesReprogramada: number;
  totalArchivos: number;
}

export interface ReunionPaginaInicialDTO {
  proyectos: ProyectoFiltroDTO[];
  reunionEstados: CatalogoDTO[];
  trabajadores: TrabajadorAbrilDTO[];
  /** Temas predefinidos para el desplegable de "Tema de la reunión" al agendar. */
  temas: CatalogoDTO[];
  reuniones: PagedResultDTO<ReunionListItemDTO>;
}

export interface ReunionParticipanteDTO {
  reunionParticipanteId: number;
  nombre: string;
  cargo: string | null;
  iniciales: string | null;
  asistio: boolean;
  orden: number;
}

export interface ReunionAcuerdoDTO {
  reunionAcuerdoId: number;
  descripcion: string;
  acciones: string | null;
  fechaProgramada: string | null;
  fechaReprogramacion: string | null;
  fechaCumplimiento: string | null;
  reunionAcuerdoEstadoId: number;
  reunionAcuerdoEstado: string;
  orden: number;
  responsableIds: number[];
}

export interface ReunionArchivoDTO {
  reunionArchivoId: number;
  archivoUrl: string;
  originalFileName: string | null;
  createdDateTime: string;
}

export interface ReunionReprogramacionDTO {
  reunionReprogramacionId: number;
  fechaAnterior: string;
  horaInicioAnterior: string | null;
  horaFinAnterior: string | null;
  fechaNueva: string;
  horaInicioNueva: string | null;
  horaFinNueva: string | null;
  motivo: string | null;
  createdDateTime: string;
  createdUserName: string | null;
}

export interface ReunionDetalleDTO {
  reunionId: number;
  projectId: number;
  projectDescription: string;
  numero: number;
  tema: string;
  convocadoPor: string | null;
  lugar: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  reunionEstadoId: number;
  reunionEstado: string;
  observaciones: string | null;
  reunionAnteriorId: number | null;
  reunionAnteriorNumero: number | null;
  reunionAnteriorTema: string | null;
  reunionSiguienteId: number | null;
  reunionSiguienteNumero: number | null;
  reunionSiguienteTema: string | null;
  participantes: ReunionParticipanteDTO[];
  acuerdos: ReunionAcuerdoDTO[];
  archivos: ReunionArchivoDTO[];
  reprogramaciones: ReunionReprogramacionDTO[];
  acuerdoEstados: CatalogoDTO[];
  trabajadores: TrabajadorAbrilDTO[];
  /** Temas predefinidos para el desplegable al "Agendar siguiente reunión". */
  temas: CatalogoDTO[];
}

// ── Requests ───────────────────────────────────────────────────────────────
export interface ReunionParticipanteInput {
  reunionParticipanteId: number | null;
  /**
   * workers.id cuando el participante se eligió del desplegable de trabajadores de Abril.
   * Si el worker no tiene puesto, el cargo ingresado a mano se da de alta en el catálogo `puesto`.
   */
  workerId?: number | null;
  nombre: string;
  cargo: string | null;
  iniciales: string | null;
  asistio: boolean;
}

export interface ReunionCreateRequest {
  projectId: number;
  tema: string;
  convocadoPor: string | null;
  lugar: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  reunionAnteriorId: number | null;
  participantes: ReunionParticipanteInput[];
}

export interface ReunionUpdateRequest {
  tema: string;
  convocadoPor: string | null;
  lugar: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  participantes: ReunionParticipanteInput[];
}

export interface ReunionReprogramarRequest {
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string | null;
}

export interface ReunionAcuerdoRequest {
  descripcion: string;
  acciones: string | null;
  fechaProgramada: string | null;
  fechaReprogramacion: string | null;
  fechaCumplimiento: string | null;
  reunionAcuerdoEstadoId: number | null;
  responsableIds: number[];
}

// ── Carpeta de SharePoint para adjuntos ─────────────────────────────────────

/** Carpeta única (singleton) de SharePoint/OneDrive donde se guardan los adjuntos de las actas. */
export interface ReunionFolderDTO {
  reunionFolderId: number;
  linkUrl: string;
  driveId: string;
  folderId: string;
  folderName: string | null;
  webUrl: string | null;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}

export interface ReunionFiltro {
  projectId: number | null;
  reunionEstadoId: number | null;
  desde: string | null;
  hasta: string | null;
  page: number;
  pageSize: number;
}
