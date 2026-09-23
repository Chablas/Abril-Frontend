/**
 * Cómo se registró una firma. Son los códigos de la tabla `firma_tipo` del backend.
 */
export type FirmaTipoCodigo = 'DIBUJO' | 'IMAGEN';

/**
 * Una firma ya registrada por el usuario logueado. Una persona puede tener una POR TIPO
 * (`person_firma`): la dibujada con el mouse, la subida como imagen, o las dos. Da igual desde qué
 * pantalla se registró — es la misma que se estampa en las facturas de Contabilidad, en la carta
 * oferta de Onboarding y en la planilla de rendición de Gestión Administrativa.
 */
export interface FirmaPersonalDto {
  tipo: FirmaTipoCodigo;
  /** data:image/png;base64,… para usar directamente en un <img src>. */
  imageDataUrl: string;
  updatedDateTime?: string | null;
}

/** Un tipo de firma del catálogo y si hoy se ofrece al firmar. */
export interface FirmaTipoDto {
  codigo: FirmaTipoCodigo;
  nombre: string;
  /**
   * Los checkboxes de Consolidados → Configuración → Firmas. Solo esa pantalla los honra:
   * Contabilidad y "Tu firma" siguen ofreciendo únicamente el dibujo.
   */
  activo: boolean;
}

/**
 * Qué tipos se ofrecen y qué firmas tiene ya el usuario. Viene todo junto en la misma respuesta
 * porque el modal que salta al aprobar un consolidado necesita las dos cosas a la vez para saber si
 * muestra el lienzo, el selector de imagen o ambos.
 */
export interface FirmaPersonalEstadoDto {
  tipos: FirmaTipoDto[];
  /** Vacío si el usuario todavía no registró ninguna. */
  firmas: FirmaPersonalDto[];
}
