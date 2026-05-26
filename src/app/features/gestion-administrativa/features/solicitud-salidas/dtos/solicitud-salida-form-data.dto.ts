export interface MotivoSalidaDto {
  id: number;
  descripcion: string;
}

export interface LugarSalidaDto {
  id: number;
  nombreDisplay: string;
  esLibre: boolean;
}

export interface TrayectoCatalogoOptionDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
}

export interface SolicitudSalidaFormDataDto {
  motivos: MotivoSalidaDto[];
  lugares: LugarSalidaDto[];
  aprobadorEmail: string | null;
  /** True si el trabajador es de Tecnología de la Información. */
  esTI: boolean;
  /** Catálogo (lugarOrigenId, lugarDestinoId) → monto. Solo poblado si esTI. */
  trayectosCatalogo: TrayectoCatalogoOptionDto[];
}
