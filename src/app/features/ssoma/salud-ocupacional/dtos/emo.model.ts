import { ConvalidacionListDto } from './convalidacion.model';

export type AptitudEmo =
  | 'Apto'
  | 'Apto con Restricciones'
  | 'No Apto'
  | 'Observado'
  | 'Pendiente'
  | string;

export type EstadoEmo = 'Vigente' | 'Por Vencer' | 'Vencido' | 'Anulado' | string;

export interface EmoListItemDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  tipoEmo: string;
  empresa: string;
  fechaEmo: string;
  fechaVencimiento: string;
  aptitud: AptitudEmo;
  estado: EstadoEmo;
  diasParaVencer: number;
}

export interface EmoDetalleDto extends EmoListItemDto {
  clinica?: string;
  medico?: string;
  numeroInforme?: string;
  urlResultado?: string;
  requiereInterconsulta: boolean;
  notas?: string;
  examenes?: EmoExamenDetalleDto[];
  restricciones?: EmoRestriccionDto[];
  convalidaciones?: ConvalidacionListDto[];
}

export interface EmoExamenDetalleDto {
  id: number;
  examenTipo: string;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionDto {
  id: number;
  restriccionTipo?: string;
  descripcionLibre?: string;
  vigente: boolean;
}

export interface EmoCreateDto {
  workerId: number;
  tipoEmoId: number;
  empresaOrigenId: number;
  fechaEmo: string;
  clinicaId?: number;
  medicoId?: number;
  aptitud: AptitudEmo;
  requiereInterconsulta: boolean;
  numeroInforme?: string;
  urlResultado?: string;
  notas?: string;
  examenes: EmoExamenCreateDto[];
  restricciones: EmoRestriccionCreateDto[];
}

export interface EmoExamenCreateDto {
  examenTipoId: number;
  resultado?: string;
  valor?: string;
  unidad?: string;
  observacion?: string;
}

export interface EmoRestriccionCreateDto {
  restriccionTipoId?: number;
  descripcionLibre?: string;
}

export interface WorkerEmoHistorialDto {
  workerId: number;
  workerNombre: string;
  workerDni: string;
  ocupacion?: string;
  empresa?: string;
  vinculaciones?: VinculacionConEmosDto[];
}

export interface VinculacionConEmosDto {
  empresaNombre: string;
  fechaInicio: string;
  fechaFin?: string;
  emos?: EmoListItemDto[];
}

export interface EmoQueryParams {
  workerId?: number;
  estado?: string;
  aptitud?: string;
  empresaId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}
