export type TipoCronogramaPlantilla = 'ANTEPROYECTO' | 'PROYECTO' | 'PROYECTO_ACTUALIZACION';

export interface PlantillaItemDto {
  id: number;
  tipoCronograma: string;
  codigo: string;
  nombre: string;
  nivel: number;
  esPadre: boolean;
  parentCodigo: string | null;
  predecesoraCodigo: string | null;
  orden: number;
}

export interface PlantillaDto {
  tipoCronograma: string;
  items: PlantillaItemDto[];
}

export interface CrearPlantillaItemRequest {
  tipoCronograma: string;
  codigo: string;
  nombre: string;
  nivel: number;
  esPadre: boolean;
  parentCodigo: string | null;
  predecesoraCodigo: string | null;
  orden: number;
}

export interface EditarPlantillaItemRequest {
  codigo: string;
  nombre: string;
  nivel: number;
  esPadre: boolean;
  parentCodigo: string | null;
  predecesoraCodigo: string | null;
  orden: number;
}
