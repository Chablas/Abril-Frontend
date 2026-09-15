/**
 * DTOs de la página PÚBLICA donde el postulante ve y firma su carta oferta. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/CartaOfertaFirmaDtos.cs`.
 */

/** Todo lo que la página necesita al abrirse (una sola petición). */
export interface CartaOfertaFirmaPublico {
  /** Nombre del postulante, para saludarlo y para que confirme que la carta es suya. */
  nombre: string;
  puesto: string | null;
  area: string | null;
  empresa: string | null;
  proyectoObra: string | null;
  jefeDirecto: string | null;
  /** 'YYYY-MM-DD'. */
  fechaIngreso: string | null;

  /** Nombre del archivo de la carta oferta que subió GTH. */
  cartaNombre: string | null;

  /**
   * Firma ya guardada en su ficha de la base maestra, como data URL para un `<img>`. Null = todavía
   * no registró ninguna, y el botón «Firmar» sigue bloqueado.
   */
  firmaDataUrl: string | null;
  firmaActualizadaEn: string | null;

  /** true si la carta ya quedó firmada: la página pasa a solo lectura. */
  yaFirmada: boolean;
  firmadaEn: string | null;

  /** true si GTH ya revisó y aprobó la carta firmada: el proceso está cerrado. */
  aprobada: boolean;

  /**
   * true si el colaborador ya pulsó «Finalizar». La página pasa a su pantalla de cierre: firmó y
   * cerró el trámite, y no hay nada más que pueda hacer desde acá.
   */
  finalizada: boolean;
  finalizadaEn: string | null;

  /** Cuándo abrió este enlace por primera vez: es la fecha de conformidad que imprime su carta. */
  primeraAperturaEn: string | null;
}

/** Resultado de guardar la firma: la firma que quedó, para repintarla. */
export interface CartaOfertaFirmaGuardarResult {
  message: string;
  firmaDataUrl: string | null;
  firmaActualizadaEn: string | null;
}

/** Resultado de firmar la carta. */
export interface CartaOfertaFirmarResult {
  message: string;
  firmadaEn: string | null;
}

/** Resultado de finalizar: el cierre del trámite, después de firmar. */
export interface CartaOfertaFinalizarResult {
  message: string;
  finalizadaEn: string | null;
}
