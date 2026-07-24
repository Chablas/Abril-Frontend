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
