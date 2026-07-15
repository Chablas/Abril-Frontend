export interface GaMotivoSalidaConfigItemDto {
  id: number;
  descripcion: string;
  activo: boolean;
  /** Si true, al solicitar una salida con este motivo se exige un documento adjunto. */
  requiereAdjunto: boolean;
  /** Si true, las horas declaradas son estimadas: recepción no registra la hora real. */
  esHoraEstimada: boolean;
  createdAt: string;
}

export interface GaMotivoSalidaCreateDto {
  descripcion: string;
  requiereAdjunto: boolean;
  esHoraEstimada: boolean;
}

export interface GaMotivoSalidaEditDto {
  descripcion: string;
  requiereAdjunto: boolean;
  esHoraEstimada: boolean;
}
