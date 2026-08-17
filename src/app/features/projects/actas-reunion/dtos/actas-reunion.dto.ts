export interface CatalogoDTO {
  id: number;
  descripcion: string;
}

export interface ProyectoFiltroDTO {
  projectId: number;
  projectDescription: string;
}

/**
 * Tema del desplegable "Tema de la reunión", con el área/gerencia de su convocatoria recurrente
 * (si tiene) para poder ocultarlo cuando no aplica al ámbito elegido — ej. "Reunión de Jefaturas
 * de Proyectos" (areaScopeId = Gerencia de Proyectos) no debe salir al agendar una reunión de un
 * proyecto puntual. areaScopeId null = sin área asociada, aplica a cualquier ámbito.
 */
export interface ReunionTemaOpcionDTO {
  id: number;
  descripcion: string;
  areaScopeId: number | null;
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
  projectId: number | null;
  projectDescription: string | null;
  /** Nodo del árbol area_scope (gerencia/área/subárea); null si la reunión es de proyecto o de toda la organización. */
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
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
  temas: ReunionTemaOpcionDTO[];
  reuniones: PagedResultDTO<ReunionListItemDTO>;
}

export interface ReunionParticipanteDTO {
  reunionParticipanteId: number;
  workerId: number | null;
  nombre: string;
  cargo: string | null;
  iniciales: string | null;
  asistio: boolean;
  orden: number;
}

/** Responsable de un acuerdo, con su estado de aceptación individual. */
export interface ReunionAcuerdoResponsableDTO {
  reunionAcuerdoResponsableId: number;
  workerId: number;
  workerNombre: string;
  /** PENDIENTE | ACEPTADO | RECHAZADO. */
  estadoAceptacion: string;
  motivoRechazo: string | null;
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
  requiereAceptacion: boolean;
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  responsables: ReunionAcuerdoResponsableDTO[];
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
  projectId: number | null;
  projectDescription: string | null;
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
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
  temas: ReunionTemaOpcionDTO[];
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
  /** Reunión de proyecto. Exactamente uno de projectId/areaScopeId, o ninguno (reunión de toda la organización). */
  projectId: number | null;
  /** Reunión de un nodo del árbol area_scope (gerencia/área/subárea). */
  areaScopeId: number | null;
  tema: string;
  /** Tema del catálogo elegido (null si es personalizado), para heredar su configuración de agenda/recordatorio. */
  reunionTemaId: number | null;
  convocadoPor: string | null;
  lugar: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  reunionAnteriorId: number | null;
  /** Agenda fija ad-hoc, obligatoria cuando la reunión es puntual (tema personalizado, no recurrente). */
  agendaTexto: string | null;
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
  /** Si true, cada responsable debe aceptar el acuerdo antes de quedar activo. */
  requiereAceptacion: boolean;
  /** Si true, no se puede marcar CUMPLIDO sin adjuntar evidencia. */
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  /** Ids de workers (cualquier trabajador de la organización, haya asistido o no). */
  responsableWorkerIds: number[];
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

/** Una regla de convocatoria de un tema: a quién convocar (área/gerencia y/o proyecto + puestos).
 * Un tema puede tener varias reglas independientes (ej. jefaturas de una gerencia + un gerente
 * puntual de otra). */
export interface TemaConvocatoriaReglaDTO {
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
  projectId: number | null;
  projectDescription: string | null;
  puestoIds: number[];
}

export interface TemaConvocatoriaReglaInput {
  areaScopeId: number | null;
  projectId: number | null;
  puestoIds: number[];
}

/** Convocatoria recurrente asociada a un tema (ej. "Reunión de Jefaturas de Proyectos"). */
export interface TemaConvocatoriaDTO {
  reglas: TemaConvocatoriaReglaDTO[];
  agendaFija: boolean;
  agendaTexto: string | null;
  recordatorioHorasAntes: number | null;
}

export interface TemaConvocatoriaSaveRequest {
  reglas: TemaConvocatoriaReglaInput[];
  agendaFija: boolean;
  agendaTexto: string | null;
  recordatorioHorasAntes: number | null;
}

// ── Agenda de reunión ────────────────────────────────────────────────────────
export interface ReunionAgendaItemDTO {
  reunionAgendaItemId: number;
  workerId: number;
  workerNombre: string;
  descripcion: string;
  orden: number;
}

export interface ReunionAgendaDTO {
  requiereAgenda: boolean;
  agendaFija: boolean;
  agendaTexto: string | null;
  items: ReunionAgendaItemDTO[];
  participantesPendientes: string[];
  workerIdActual: number | null;
}

export interface ReunionAgendaItemInput {
  descripcion: string;
}

export interface GuardarMisTemasRequest {
  temas: ReunionAgendaItemInput[];
}

export interface ReunionFiltro {
  projectId: number | null;
  /** Nodo del árbol area_scope; incluye descendientes. */
  areaScopeId: number | null;
  reunionEstadoId: number | null;
  desde: string | null;
  hasta: string | null;
  page: number;
  pageSize: number;
}
