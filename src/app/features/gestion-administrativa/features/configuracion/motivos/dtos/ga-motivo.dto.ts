export interface GaMotivoSalidaConfigItemDto {
  id: number;
  descripcion: string;
  activo: boolean;
  /** Si true, al solicitar una salida con este motivo se exige un documento adjunto. */
  requiereAdjunto: boolean;
  /** Si true, las horas declaradas son estimadas: recepción no registra la hora real. */
  esHoraEstimada: boolean;
  /** Si true, al elegir este motivo en una solicitud se exige escribir un motivo adicional. */
  requiereMotivoAdicional: boolean;
  /** Si false, al elegir este motivo la solicitud no pide horas, ni lugares,
   *  ni trayectos adicionales (ej. licencia sin goce de haber). */
  pideHorasLugares: boolean;
  /** Si true, una salida con este motivo genera reembolso de movilidad. El trayecto
   *  elegido puede anularlo (ga_trayecto.esReembolsable), nunca al revés. */
  esReembolsable: boolean;
  /** true en la fila que configura «Otro motivo», la vía de texto libre del formulario:
   *  no se ofrece en el desplegable, no se renombra y no pide motivo adicional (el texto
   *  libre YA es ese detalle). Sus demás opciones se editan como en cualquier motivo. */
  esMotivoLibre: boolean;
  createdAt: string;
}

export interface GaMotivoSalidaCreateDto {
  descripcion: string;
  requiereAdjunto: boolean;
  esHoraEstimada: boolean;
  requiereMotivoAdicional: boolean;
  /** Si false, al elegir este motivo la solicitud no pide horas, ni lugares,
   *  ni trayectos adicionales (ej. licencia sin goce de haber). */
  pideHorasLugares: boolean;
  /** Si true, una salida con este motivo genera reembolso de movilidad. El trayecto
   *  elegido puede anularlo (ga_trayecto.esReembolsable), nunca al revés. */
  esReembolsable: boolean;
}

export interface GaMotivoSalidaEditDto {
  descripcion: string;
  requiereAdjunto: boolean;
  esHoraEstimada: boolean;
  requiereMotivoAdicional: boolean;
  /** Si false, al elegir este motivo la solicitud no pide horas, ni lugares,
   *  ni trayectos adicionales (ej. licencia sin goce de haber). */
  pideHorasLugares: boolean;
  /** Si true, una salida con este motivo genera reembolso de movilidad. El trayecto
   *  elegido puede anularlo (ga_trayecto.esReembolsable), nunca al revés. */
  esReembolsable: boolean;
}
