export interface SolicitudSalidaListItemDto {
  id: number;
  fechaSalida: string;
  /** Hora de salida del primer trayecto. */
  horaSalida: string;
  /** Hora de retorno del último trayecto. */
  horaRetorno: string | null;
  /** Motivo del primer trayecto. */
  motivo: string;
  /** Origen del primer trayecto. */
  lugarOrigen: string | null;
  /** Destino del último trayecto. */
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  /** True si todos los trayectos tienen capturas (o catálogo TI) — habilita la rendición. */
  puedeRendirse: boolean;
}
