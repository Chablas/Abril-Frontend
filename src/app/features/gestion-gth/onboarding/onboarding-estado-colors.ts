/**
 * Colores del badge de estado del onboarding (espejo de `gth_onboarding_estado.codigo`) y de la
 * barra de avance. Van juntos acá para que el estado se pinte igual en la tabla y en las tarjetas.
 *
 * CARTA_ENVIADA salió del catálogo: la carta oferta se envía y se aprueba en Reclutamiento, así que
 * un onboarding nace ya EN_PROCESO.
 */
export function estadoOnboardingColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'EN_PROCESO':    return { bg: '#E0F2FE', text: '#0284C7' };
    case 'COMPLETO':      return { bg: '#DCFCE7', text: '#15803D' };
    default:              return { bg: '#F3F4F6', text: '#374151' };
  }
}

/**
 * Color de la barra de avance según qué tan cerca está el onboarding de cerrarse. Es el mismo
 * criterio del Figma: ámbar cuando recién arranca, azul mientras avanza y verde al completarse.
 */
export function avanceColor(porcentaje: number): string {
  if (porcentaje >= 100) return '#15803D';
  if (porcentaje >= 50) return 'var(--color-abril-logo-blue)';
  return '#F59E0B';
}
