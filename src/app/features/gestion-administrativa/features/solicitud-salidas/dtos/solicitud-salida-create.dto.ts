export interface SolicitudSalidaCreateDto {
  fechaSalida: string;        // 'YYYY-MM-DD'
  horaSalida: string;         // 'HH:mm'
  horaRetorno: string | null; // 'HH:mm' | null
  motivoId: number;
  lugarOrigenId: number | null;
  lugarOrigenLibre: string | null;
  lugarDestinoId: number | null;
  lugarDestinoLibre: string | null;
}
