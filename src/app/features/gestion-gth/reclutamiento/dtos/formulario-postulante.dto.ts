/**
 * DTOs del formulario del postulante en la vista de GTH (envío + revisión). El postulante lo llena
 * desde la página pública; aquí GTH lo envía, lo revisa y lo aprueba/rechaza.
 */

/** Estado del formulario de un candidato tal como se muestra en la bandeja de GTH. */
export interface CandidatoFormularioResumen {
  /** null si GTH aún no envió el enlace. Si no: ENVIADO / COMPLETADO / APROBADO / RECHAZADO. */
  estadoCodigo: string | null;
  estadoNombre: string | null;
  correoEnvio: string | null;
  enviadoEn: string | null;
  completadoEn: string | null;
  revisadoNombre: string | null;
  revisadoEn: string | null;
}

/** Datos declarados por el postulante, ya resueltos a nombre (para el modal de revisión de GTH). */
export interface FormularioDatos {
  // Página 1
  nombresCompletos: string | null;
  fechaNacimiento: string | null;
  estadoCivil: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  distrito: string | null;
  correoElectronico: string | null;
  numeroCelular: string | null;
  pretensionesSalariales: string | null;
  disponibilidad: string | null;
  linkedin: string | null;
  portafolioLink: string | null;
  // Página 2
  profesion: string | null;
  universidad: string | null;
  gradoAcademico: string | null;
  numeroColegiatura: string | null;
  // Página 3
  empresa: string | null;
  areaTrabajo: string | null;
  cargo: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  motivoCese: string | null;
  funcionesPrincipales: string | null;
  logros: string | null;
  ingresoBrutoMensual: string | null;
  personasACargo: number | null;
  jefeInmediato: string | null;
  autorizaVerificacionReferencias: boolean | null;
  // Página 4
  declaracionVeracidad: boolean | null;
  confirmacionDocumentos: boolean | null;
}

/** Formulario del candidato para el modal "Ver formulario" de GTH. */
export interface FormularioRevision {
  /** false si GTH aún no envió el formulario (el modal solo muestra la estructura/estado). */
  existe: boolean;
  estadoCodigo: string;
  estadoNombre: string;
  candidatoNombre: string;
  correoEnvio: string | null;
  enviadoEn: string | null;
  completadoEn: string | null;
  revisadoNombre: string | null;
  revisadoEn: string | null;
  motivoRechazo: string | null;
  /** Datos declarados por el postulante (null si aún no completó el formulario). */
  datos: FormularioDatos | null;
}

/** Resultado de enviar el formulario o registrar la decisión (para refrescar el modal). */
export interface FormularioAccionResult {
  message: string;
  formulario: CandidatoFormularioResumen;
}

/** Resultado del envío del formulario de un candidato dentro de un envío masivo. */
export interface FormularioEnvioMasivoResultado {
  candidatoId: number;
  /** false si el candidato no pasó las validaciones o si su correo no llegó a salir. */
  enviado: boolean;
  /** Motivo del fallo, para mostrarlo junto al candidato. null si se envió bien. */
  error: string | null;
  /**
   * Estado del formulario tras el envío. Viene incluso cuando el correo falló —el formulario ya
   * quedó registrado en ese punto— y solo es null cuando no se llegó a tocar la base de datos.
   */
  formulario: CandidatoFormularioResumen | null;
}

/** Resultado del envío masivo: resumen del lote + el detalle de cada candidato. */
export interface FormularioEnvioMasivoResult {
  message: string;
  enviados: number;
  fallidos: number;
  resultados: FormularioEnvioMasivoResultado[];
}
