/**
 * Sección "Días reembolsables" de Solicitud de Salidas → Configuración: cuántos días hábiles del mes
 * siguiente dura el plazo para rendir un mes, y hasta qué mes hacia atrás alcanza ese permiso.
 * Antes el plazo era un 7 escrito en el backend (`CalendarioNoLaborable.DiasHabilesDePlazo`) y el
 * alcance, un "solo el mes anterior" que no se podía tocar.
 */
export interface PlazoRendicion {
  /** Días hábiles de plazo configurados hoy. */
  diasHabilesPlazo: number;
  /** Rango aceptado; lo manda el backend para no repetirlo en la pantalla. */
  diasMinimo: number;
  diasMaximo: number;
  /** Mes más viejo que HOY se puede rendir: el efecto concreto de los tres campos juntos. */
  rendibleDesdeAnio: number;
  rendibleDesdeMes: number;

  /** Hasta qué mes hacia atrás alcanza la ventana de los días hábiles. */
  alcancePlazoId: number;
  /** Hasta qué mes hacia atrás se rinde en cualquier momento del mes. null = no aplica. */
  alcancePermanenteId: number | null;
  /** Opciones de los dos desplegables: son las mismas para ambos. */
  alcances: AlcanceRendicionOpcion[];
}

/** Una opción del catálogo `ga_rendicion_alcance`. */
export interface AlcanceRendicionOpcion {
  id: number;
  nombre: string;
  /** Meses hacia atrás que abarca (1 = el mes anterior). */
  mesesAtras: number;
}

/** Cuerpo del guardado: el número y los dos alcances. */
export interface PlazoRendicionSave {
  diasHabilesPlazo: number;
  alcancePlazoId: number;
  alcancePermanenteId: number | null;
}

/** Respuesta del guardado: trae el plazo ya recalculado. */
export interface PlazoRendicionSaveResult {
  plazo: PlazoRendicion;
  message: string;
}
