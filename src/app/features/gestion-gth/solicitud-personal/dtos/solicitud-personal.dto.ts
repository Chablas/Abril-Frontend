export interface OpcionDto {
  id: number;
  nombre: string;
}

/** Datos del formulario "Nueva solicitud de personal" en una sola petición. */
export interface ReclutamientoFormDataDto {
  areaNombre: string | null;
  areaScopeId: number | null;
  maxVacantes: number;
  puestos: OpcionDto[];
  tiposRequerimiento: OpcionDto[];
  proyectos: OpcionDto[];
}

export interface VacanteCreateDto {
  puestoId: number | null;
  tipoRequerimientoId: number | null;
  projectId: number | null;
  /** Fecha requerida de ingreso en formato nativo "YYYY-MM-DD". */
  fechaRequeridaIngreso: string;
}

export interface SolicitudPersonalCreateDto {
  justificacion: string | null;
  vacantes: VacanteCreateDto[];
}

export interface SolicitudPersonalCreateResult {
  id: number;
  codigos: string[];
  message: string;
}

/** Una fase del pipeline dentro del seguimiento vertical del requerimiento. */
export interface FaseSeguimiento {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** Estado visual respecto a la fase actual: 'done' | 'current' | 'pending'. */
  estado: 'done' | 'current' | 'pending';
}

/** Detalle de seguimiento de un requerimiento (modal "Estado del reclutamiento"). */
export interface Seguimiento {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  tipoRequerimiento: string;
  area: string | null;
  proyectoObra: string | null;
  justificacion: string | null;
  /** Fecha requerida de ingreso ("YYYY-MM-DD"). */
  fechaRequeridaIngreso: string;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
  estadoOrden: number;
  /** ¿Requiere aprobación de Gerencia General? (solo puestos nuevos). */
  aprobacionGgRequerida: boolean;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  fases: FaseSeguimiento[];
  /** Descripción de la fase actual (siguiente acción pendiente). */
  siguientePaso: string | null;
}

/** Fila de la tabla "Mis solicitudes de vacante" (un requerimiento del usuario). */
export interface SolicitudVacanteListItem {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  justificacion: string | null;
  area: string | null;
  proyectoObra: string | null;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
}

/**
 * Tarjeta de "Gestión de candidatos": un requerimiento cuya long list ya fue enviada por
 * GTH (estado LONG_LIST_ENVIADA) y está pendiente de la revisión del solicitante.
 */
export interface GestionCandidatoCard {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  /** Cantidad de candidatos que GTH cargó en la long list. */
  totalCandidatos: number;
  estadoCodigo: string;
  estadoNombre: string;
}

/** Panel de la vista del solicitante: tarjetas de gestión de candidatos + tabla de solicitudes. */
export interface SolicitantePanel {
  gestionCandidatos: GestionCandidatoCard[];
  misSolicitudes: SolicitudVacanteListItem[];
}

/** Un candidato de la long list como lo revisa el solicitante (modal "Revisar long list y CVs"). */
export interface CandidatoRevision {
  candidatoId: number;
  nombre: string;
  puesto: string | null;
  experienciaAnios: number | null;
  disponibilidad: string | null;
  /** Fuente de reclutamiento (nombre del canal). */
  fuenteNombre: string | null;
  comentario: string | null;
  /** Nombre y link del CV en SharePoint (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  /** Nombre y link del informe en SharePoint (opcional). */
  informeNombre: string | null;
  informeUrl: string | null;
  /** Estado de revisión (PENDIENTE / APROBADO / RECHAZADO). */
  estadoCodigo: string;
  estadoNombre: string;
}

/** Revisión de la long list de un requerimiento: cabecera + candidatos. */
export interface RevisionLongList {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  estadoCodigo: string;
  estadoNombre: string;
  candidatos: CandidatoRevision[];
}
