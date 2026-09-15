export interface ProjectOptionDTO {
  projectId: number;
  projectDescription: string;
}

export interface CatalogOptionDTO {
  id: number;
  descripcion: string;
}

/** Un tipo de licencia dentro de la plantilla de un proyecto, con su estado vigente. */
export interface VecinoLicenciaItemDTO {
  /** Solo poblado en la vista combinada (todos los proyectos). */
  projectId?: number;
  projectDescription?: string;

  vecinoLicenciaControlId: number | null;
  vecinoLicenciaControlTipoId: number;
  tipoDescripcion: string;
  orden: number;
  /** true = viene de la plantilla base (compartida); false = agregado solo para este proyecto. */
  esBase: boolean;
  vecinoLicenciaControlEstadoId: number;
  estadoDescripcion: string;
  archivoUrl: string | null;
  originalFileName: string | null;
  fechaVencimiento: string | null; // YYYY-MM-DD
  /** Días de antelación por defecto del tipo, para sugerir el primer recordatorio al subir. */
  diasAntesDefault: number | null;
  /** Recordatorios activos de la licencia vigente (puede haber varios, ej. 30/15/7/2 días antes). */
  recordatorios: VecinoLicenciaRecordatorioDTO[];
  versionesHistorial: number;
  /** Fechas de visita de la municipalidad registradas (solo aplica al tipo Anexo H). */
  visitas: VecinoLicenciaVisitaDTO[];

  fechaInscripcion: string | null; // YYYY-MM-DD
  fechaInscripcionEstado: FechaEstado | null;
  fechaInicio: string | null; // YYYY-MM-DD
  fechaInicioEstado: FechaEstado | null;
  fechaVencimientoEstado: FechaEstado | null;
  fechaRenovacion: string | null; // YYYY-MM-DD
  fechaRenovacionEstado: FechaEstado | null;
  /** SI/NO manual: si el documento está vigente/activo este mes. */
  mesActivo: boolean;
}

/** Cuando una fecha del dashboard no es una fecha real: motivo textual (ver reference del comité). */
export type FechaEstado = 'NoSeCuenta' | 'Pendiente' | 'Indeterminado' | 'NoRegistrada';

export const FECHA_ESTADO_LABEL: Record<FechaEstado, string> = {
  NoSeCuenta: 'No se cuenta',
  Pendiente: 'Pendiente',
  Indeterminado: 'Indeterminado',
  NoRegistrada: 'No registrada',
};

/** Edita las fechas ampliadas del dashboard (inscripción/inicio/renovación) y el flag Mes Activo. */
export interface VecinoLicenciaFechasUpdateDTO {
  fechaInscripcion: string | null;
  fechaInscripcionEstado: FechaEstado | null;
  fechaInicio: string | null;
  fechaInicioEstado: FechaEstado | null;
  fechaVencimientoEstado: FechaEstado | null;
  fechaRenovacion: string | null;
  fechaRenovacionEstado: FechaEstado | null;
  mesActivo: boolean;
}

/** Una fila del dashboard gerencial: un tipo de licencia de un proyecto, con su semáforo de criticidad. */
export interface VecinoLicenciaDashboardItemDTO {
  projectId: number;
  projectDescription: string;
  /** Razón social y RUC del proyecto (vía Project.ContributorId), para el encabezado del PDF del comité. */
  razonSocial: string | null;
  ruc: string | null;
  tipoDescripcion: string;
  estadoDescripcion: string;
  fechaInscripcion: string | null;
  fechaInscripcionEstado: FechaEstado | null;
  fechaInicio: string | null;
  fechaInicioEstado: FechaEstado | null;
  fechaVencimiento: string | null;
  fechaVencimientoEstado: FechaEstado | null;
  fechaRenovacion: string | null;
  fechaRenovacionEstado: FechaEstado | null;
  mesActivo: boolean;
  diasParaVencer: number | null;
  semaforo: 'rojo' | 'amarillo' | 'verde' | 'gris';
}

export interface VecinoLicenciaDashboardResumenDTO {
  documentos: number;
  activos: number;
  pendientes: number;
  noAplica: number;
  noTiene: number;
}

export interface VecinoLicenciaDashboardResponseDTO {
  items: VecinoLicenciaDashboardItemDTO[];
  resumen: VecinoLicenciaDashboardResumenDTO;
}

/** Una fecha de visita de la municipalidad registrada en el Anexo H de una licencia. */
export interface VecinoLicenciaVisitaDTO {
  vecinoLicenciaControlVisitaId: number;
  fechaVisita: string; // YYYY-MM-DD
  observacion: string | null;
  fechaRecordatorio: string; // YYYY-MM-DD
  enviado: boolean;
}

export interface VecinoLicenciaVisitaCreateDTO {
  fechaVisita: string; // YYYY-MM-DD
  observacion: string | null;
}

/** Un recordatorio (N días antes de vencer) de una licencia. */
export interface VecinoLicenciaRecordatorioDTO {
  vecinoLicenciaControlRecordatorioId: number;
  diasAntes: number;
  fechaRecordatorio: string; // YYYY-MM-DD
  enviado: boolean;
}

export interface VecinoLicenciaRecordatorioCreateDTO {
  diasAntes: number;
}

export interface VecinoLicenciaPlantillaResponseDTO {
  items: VecinoLicenciaItemDTO[];
  estados: CatalogOptionDTO[];
}

export interface VecinoLicenciaTipoDTO {
  vecinoLicenciaControlTipoId: number;
  descripcion: string;
  orden: number;
  esBase: boolean;
  diasAntesDefault: number | null;
}

/** Alta o edición de un tipo del catálogo base (visible en todos los proyectos). */
export interface VecinoLicenciaTipoBaseUpsertDTO {
  descripcion: string;
  diasAntesDefault: number | null;
}

/** Alta de un tipo propio de un proyecto. */
export interface VecinoLicenciaTipoCreateDTO {
  descripcion: string;
  diasAntesDefault: number | null;
}

/** Payload del formulario de subida/reemplazo (el archivo se envía aparte como multipart). */
export interface VecinoLicenciaUploadDTO {
  fechaVencimiento: string; // YYYY-MM-DD
  /** Días de antelación de cada recordatorio a crear (ej. [30, 15, 7, 2]). Al menos uno. */
  diasAntesRecordatorio: number[];
}

export interface VecinoLicenciaHistorialItemDTO {
  vecinoLicenciaControlHistorialId: number;
  archivoUrl: string;
  originalFileName: string | null;
  fechaVencimiento: string | null;
  fechaRecordatorio: string | null;
  diasAntes: number | null;
  motivo: string | null;
  createdDateTime: string;
  createdUserName: string | null;
}

/** Correo resuelto automáticamente desde la ficha del proyecto — mismo criterio que EMOs. */
export interface VecinoLicenciaDestinatarioAutomaticoDTO {
  rol: string;
  email: string | null;
}

/** Correo adicional configurado a mano (ej. Jefe SSOMA cuando aplique). */
export interface VecinoLicenciaDestinatarioDTO {
  vecinoLicenciaControlDestinatarioId: number;
  rol: string;
  email: string;
}

export interface VecinoLicenciaDestinatariosResponseDTO {
  automaticos: VecinoLicenciaDestinatarioAutomaticoDTO[];
  adicionales: VecinoLicenciaDestinatarioDTO[];
}
