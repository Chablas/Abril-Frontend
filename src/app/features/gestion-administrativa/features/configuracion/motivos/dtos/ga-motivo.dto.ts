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
}

export interface GaMotivoSalidaEditDto {
  descripcion: string;
  requiereAdjunto: boolean;
  esHoraEstimada: boolean;
  requiereMotivoAdicional: boolean;
  /** Si false, al elegir este motivo la solicitud no pide horas, ni lugares,
   *  ni trayectos adicionales (ej. licencia sin goce de haber). */
  pideHorasLugares: boolean;
}
