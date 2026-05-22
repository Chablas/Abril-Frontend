export interface SolicitudSalidaListItemDto {
  id: number;
  fechaSalida: string;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
}
