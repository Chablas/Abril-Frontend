export interface GaMotivoSalidaConfigItemDto {
  id: number;
  descripcion: string;
  activo: boolean;
  /** Si true, al solicitar una salida con este motivo se exige un documento adjunto. */
  requiereAdjunto: boolean;
  createdAt: string;
}

export interface GaMotivoSalidaCreateDto {
  descripcion: string;
  requiereAdjunto: boolean;
}

export interface GaMotivoSalidaEditDto {
  descripcion: string;
  requiereAdjunto: boolean;
}
