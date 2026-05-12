export interface HoraOpcionDto {
  id: number;
  etiqueta: string;
}

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
  horas: HoraOpcionDto[];
  motivos: MotivoSalidaDto[];
  lugares: LugarSalidaDto[];
}
