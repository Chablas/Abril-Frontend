/**
 * Sección "Días reembolsables" de Solicitud de Salidas → Configuración: cuántos días hábiles del mes
 * siguiente dura el plazo para rendir un mes. Antes era un 7 escrito en el backend
 * (`CalendarioNoLaborable.DiasHabilesDePlazo`).
 */
export interface PlazoRendicion {
  /** Días hábiles de plazo configurados hoy. */
  diasHabilesPlazo: number;
  /** Rango aceptado; lo manda el backend para no repetirlo en la pantalla. */
  diasMinimo: number;
  diasMaximo: number;
  /** Último día para rendir el mes anterior con el plazo actual (YYYY-MM-DD). */
  limiteMesAnterior: string;
  /** Mes al que corresponde `limiteMesAnterior`. */
  mesAnteriorAnio: number;
  mesAnteriorMes: number;
  /** true = con el plazo de hoy, ese mes ya está cerrado. */
  mesAnteriorVencido: boolean;
}

/** Respuesta del guardado: trae el plazo ya recalculado. */
export interface PlazoRendicionSaveResult {
  plazo: PlazoRendicion;
  message: string;
}
