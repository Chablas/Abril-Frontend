export interface ProyectoSimpleDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string | null;
  avance: number;
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
}
