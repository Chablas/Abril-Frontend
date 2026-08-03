/** Opción genérica {id, nombre} para los desplegables del formulario. */
export interface OpcionFormulario {
  id: number;
  nombre: string;
}

/** Distrito para el desplegable (incluye la provincia para agrupar/mostrar). */
export interface DistritoOpcion {
  id: number;
  nombre: string;
  /** LIMA o CALLAO. */
  provincia: string;
}

/**
 * Respuestas del formulario del postulante (ids de catálogo + valores libres). Se usa para precargar
 * (GET público) y para enviar (POST público). Las fechas van como 'YYYY-MM-DD'.
 */
export interface PostulanteFormularioRespuestas {
  // Página 1 · Datos personales
  nombresCompletos: string | null;
  fechaNacimiento: string | null;
  estadoCivilId: number | null;
  tipoDocumentoId: number | null;
  numeroDocumento: string | null;
  distritoId: number | null;
  correoElectronico: string | null;
  numeroCelular: string | null;
  convocatoriaId: number | null;
  pretensionesSalariales: string | null;
  disponibilidadId: number | null;
  linkedin: string | null;
  portafolioLink: string | null;
  // Página 2 · Estudios realizados
  profesion: string | null;
  universidadId: number | null;
  gradoAcademicoId: number | null;
  numeroColegiatura: string | null;
  // Página 3 · Experiencia laboral
  empresa: string | null;
  areaTrabajo: string | null;
  cargo: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  motivoCeseId: number | null;
  funcionesPrincipales: string | null;
  logros: string | null;
  ingresoBrutoMensual: string | null;
  personasACargo: number | null;
  jefeInmediato: string | null;
  autorizaVerificacionReferencias: boolean | null;
  // Página 4 · Consentimiento y veracidad
  declaracionVeracidad: boolean | null;
  confirmacionDocumentos: boolean | null;
}

/** Respuesta del GET público: contexto + catálogos + respuestas guardadas + estado. */
export interface PostulanteFormularioPublico {
  puesto: string;
  candidatoNombre: string;
  estadoCodigo: string;
  estadoNombre: string;
  /** true si GTH ya revisó (aprobado/rechazado) → solo lectura. */
  soloLectura: boolean;
  estadosCiviles: OpcionFormulario[];
  tiposDocumento: OpcionFormulario[];
  distritos: DistritoOpcion[];
  universidades: OpcionFormulario[];
  gradosAcademicos: OpcionFormulario[];
  disponibilidades: OpcionFormulario[];
  motivosCese: OpcionFormulario[];
  convocatorias: OpcionFormulario[];
  respuestas: PostulanteFormularioRespuestas;
}

/** Respuesta vacía por defecto (antes de cargar / para inicializar el modelo). */
export function respuestasVacias(): PostulanteFormularioRespuestas {
  return {
    nombresCompletos: null, fechaNacimiento: null, estadoCivilId: null, tipoDocumentoId: null,
    numeroDocumento: null, distritoId: null, correoElectronico: null, numeroCelular: null,
    convocatoriaId: null, pretensionesSalariales: null, disponibilidadId: null, linkedin: null,
    portafolioLink: null, profesion: null, universidadId: null, gradoAcademicoId: null,
    numeroColegiatura: null, empresa: null, areaTrabajo: null, cargo: null, fechaInicio: null,
    fechaTermino: null, motivoCeseId: null, funcionesPrincipales: null, logros: null,
    ingresoBrutoMensual: null, personasACargo: null, jefeInmediato: null,
    autorizaVerificacionReferencias: null, declaracionVeracidad: null, confirmacionDocumentos: null,
  };
}
