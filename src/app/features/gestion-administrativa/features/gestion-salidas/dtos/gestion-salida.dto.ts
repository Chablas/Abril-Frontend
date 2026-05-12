export interface GestionSalidaListItemDto {
  id: number;
  workerId: number;
  trabajador: string;
  fechaSalida: string;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  estado: string;
  createdAt: string;
}

export interface GestionSalidaFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  lugaresProyecto: LugarProyectoOptionDto[];
}

export interface TrabajadorOptionDto {
  workerId: number;
  nombreCompleto: string;
}

export interface LugarProyectoOptionDto {
  gaLugarId: number;
  nombreDisplay: string;
}
