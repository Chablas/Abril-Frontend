export interface ClinicaSimpleDto {
  id: number;
  nombre: string;
  ruc?: string;
  activo: boolean;
}

export interface MedicoSimpleDto {
  id: number;
  apellidoNombre: string;
  cmp?: string;
  especialidad?: string;
  clinicaId?: number;
  clinicaNombre?: string;
  activo: boolean;
}

export interface EmoTipoDto {
  id: number;
  nombre: string;
  vigenciaMeses: number;
  requiereNuevo: boolean;
}

export interface ExamenTipoDto {
  id: number;
  nombre: string;
  codigo?: string;
  categoria?: string;
}

export interface RestriccionTipoDto {
  id: number;
  descripcion: string;
  categoria?: string;
}

export interface EmpresaSimpleDto {
  id: number;
  nombre: string;
  ruc?: string;
  esAbril: boolean;
}
