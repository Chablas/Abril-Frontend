export interface SolicitudSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface TrayectoDetalleDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  capturas: SolicitudSalidaCapturaDto[];
}

export interface SolicitudSalidaDetalleDto {
  id: number;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  trayectos: TrayectoDetalleDto[];
}
