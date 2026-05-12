export interface GaMotivoSalidaConfigItemDto {
  id: number;
  descripcion: string;
  activo: boolean;
  createdAt: string;
}

export interface GaMotivoSalidaCreateDto {
  descripcion: string;
}

export interface GaMotivoSalidaEditDto {
  descripcion: string;
}
