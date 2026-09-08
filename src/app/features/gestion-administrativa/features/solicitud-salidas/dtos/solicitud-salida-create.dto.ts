export interface TrayectoCreateDto {
  /** "HH:mm" */
  /** Null cuando el motivo elegido no pide horario. */
  horaSalida: string | null;
  /** "HH:mm" or null (sin retorno) */
  horaRetorno: string | null;
  motivoId: number | null;
  motivoLibre: string | null;
  /** Detalle obligatorio cuando el motivo elegido lo exige. */
  motivoAdicional: string | null;
  lugarOrigenId: number | null;
  lugarOrigenLibre: string | null;
  lugarDestinoId: number | null;
  lugarDestinoLibre: string | null;
}

export interface SolicitudSalidaCreateDto {
  /** "yyyy-MM-dd" */
  fechaSalida: string;
  trayectos: TrayectoCreateDto[];
}
