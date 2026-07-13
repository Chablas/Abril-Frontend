export interface ObservacionFotoDTO {
  id: number;
  tipo: 'Observacion' | 'Levantamiento';
  url: string;
  orden: number;
}

export interface ObservacionListItemDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string | null;
  codigo: string;
  fecha: string;
  personaReporta: string | null;
  empresaReporta: string | null;
  lugar: string | null;
  descripcion: string;
  plazoLevantamiento: string | null;
  partidaReportada: string | null;
  estado: string;
  tipoObservacion: string | null;
  areaResponsable: string | null;
  ejecutor: string | null;
  origen: string;
  fotos: ObservacionFotoDTO[];
}

export interface ObservacionListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: ObservacionListItemDTO[];
}

export interface ProyectoFiltroDTO {
  id: number;
  nombre: string;
}

export interface ObservacionFiltrosDTO {
  proyectos: ProyectoFiltroDTO[];
  partidas: string[];
  estados: string[];
}

export interface ObservacionesQueryParams {
  proyectoId?: number | null;
  estado?: string | null;
  partida?: string | null;
  desde?: string | null;
  hasta?: string | null;
  search?: string | null;
  pagina: number;
  porPagina: number;
}

export interface CreateObservacionBody {
  proyectoId: number;
  fecha: string;
  personaReporta?: string | null;
  empresaReporta?: string | null;
  lugar?: string | null;
  descripcion: string;
  plazoLevantamiento?: string | null;
  partidaReportada?: string | null;
  tipoObservacion?: string | null;
  areaResponsable?: string | null;
  ejecutor?: string | null;
  creadoPor?: string | null;
}

export interface ObservacionPorPartidaDTO {
  partida: string;
  completado: number;
  pendiente: number;
}

export interface ObservacionDashboardSupervisorDTO {
  personaReporta: string;
  proyectoNombre: string | null;
  totalReportadas: number;
  totalCompletadas: number;
  totalPendientes: number;
  pctAvance: number;
  porPartida: ObservacionPorPartidaDTO[];
}

export interface ObservacionDashboardDTO {
  supervisores: ObservacionDashboardSupervisorDTO[];
}
