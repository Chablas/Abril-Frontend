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
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  puedeRendirse: boolean;
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

export interface GestionSalidaRendicionDto {
  id: number;
  pdfUrl: string;
  pdfFilename: string;
  rendidoAt: string;
}

export interface GestionSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface GestionSalidaTrayectoDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  capturas: GestionSalidaCapturaDto[];
}

export interface GestionSalidaDetalleDto {
  id: number;
  workerId: number;
  trabajador: string;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  rendicion: GestionSalidaRendicionDto | null;
  trayectos: GestionSalidaTrayectoDto[];
}
