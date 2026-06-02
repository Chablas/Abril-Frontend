export interface ProyectoSimpleDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string | null;
  avance: number;
}

// FIX-A: header del proyecto incluido en la respuesta de actividades
export interface ProyectoCronogramaHeaderDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string | null;
  fechaInicio: string | null;
}

export interface ActividadesProyectoResponseDto {
  proyecto: ProyectoCronogramaHeaderDto;
  actividades: ActividadDto[];
}

export interface ActividadDto {
  projectActivityId: number;
  projectId: number;
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  progressPercentage: number;
  order: number;
  hierarchyLevel: number;
  parentId: number | null;
  predecesoras: number[];
  esPadre: boolean;
  baselineStartDate?: string | null;
  baselineEndDate?: string | null;
}

export interface CascadaCambioDto {
  projectActivityId: number;
  activityDescription: string;
  inicioAnterior: string;
  inicioNuevo: string;
  finAnterior: string;
  finNuevo: string;
}

export interface CascadaResultDto {
  hayCambios: boolean;
  cambios: CascadaCambioDto[];
}

export interface ActualizarPredecesorasResultDto {
  projectActivityId: number;
  predecesoras: number[];
  previewCascada: CascadaResultDto;
}

export interface CrearActividadRequest {
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progressPercentage: number;
  hierarchyLevel: number;
  parentId: number | null;
}

export interface ReordenarItem {
  projectActivityId: number;
  order: number;
}

export interface EditarActividadRequest {
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  progressPercentage: number;
  // FIX-B: null = no tocar predecesoras, [] = eliminar todas
  predecessorIds?: number[] | null;
}

export interface EditarActividadResultDto {
  actividad: ActividadDto;
  cascada: CascadaResultDto | null;
}
