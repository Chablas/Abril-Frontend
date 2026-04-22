export interface ProyectoConActividadesDTO {
  id: number;
  nombre: string;
  estado: string;
  responsableArqComId: number | null;
  responsableArqCom: string | null;
  totalActividades: number;
  activas: number;
  sinActividades: boolean;
}

export interface SupervisorAcDTO {
  id: number;
  apellidoNombre: string;
}

export interface ActividadListItemDTO {
  id: number;
  projectId: number;
  projectNombre: string | null;
  indice: number | null;
  nombre: string;
  tipo: string | null;
  etapaId: number | null;
  etapaNombre: string | null;
  userId: number | null;
  responsableNombre: string | null;
  encargado1: string | null;
  inicioProgramado: string | null;
  finProgramado: string | null;
  inicioEfectivo: string | null;
  finEfectivo: string | null;
  observaciones: string | null;
  activo: boolean;
  estado: string;
  retraso: number | null;
}

export interface ActividadListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: ActividadListItemDTO[];
}

export interface ActividadesQueryParams {
  proyectoId?: number | null;
  tipo?: string | null;
  etapaId?: number | null;
  search?: string | null;
  soloActivas?: boolean | null;
  pagina?: number;
  porPagina?: number;
}

export interface ActividadPatchBody {
  inicioProgramado?: string | null;
  finProgramado?: string | null;
  inicioEfectivo?: string | null;
  finEfectivo?: string | null;
  userId?: number | null;
  observaciones?: string | null;
}

export interface ReasignarEncargadoResultDTO {
  actualizadas: number;
  workerNoEncontrado: boolean;
}

export interface PatchProyectoBody {
  responsableArqComId: number | null;
}

export interface GenerarActividadesResultDTO {
  generadas: number;
}
