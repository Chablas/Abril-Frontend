export interface MotivoSalidaDto {
  id: number;
  descripcion: string;
}

export interface LugarSalidaDto {
  id: number;
  nombreDisplay: string;
  esLibre: boolean;
}

export interface SolicitudSalidaFormDataDto {
  motivos: MotivoSalidaDto[];
  lugares: LugarSalidaDto[];
  aprobadorEmail: string | null;
}
