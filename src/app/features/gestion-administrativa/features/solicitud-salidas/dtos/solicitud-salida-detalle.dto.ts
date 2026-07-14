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
  /** webUrl del documento adjunto del trayecto (motivos que requieren documento). */
  adjuntoUrl: string | null;
  adjuntoFilename: string | null;
  capturas: SolicitudSalidaCapturaDto[];
  /** Monto del catálogo ga_trayecto (solo trabajador TI con match origen+destino). */
  montoCatalogo: number | null;
  /** Monto efectivo: suma de capturas si hay; sino montoCatalogo; sino 0. */
  montoTotal: number;
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
