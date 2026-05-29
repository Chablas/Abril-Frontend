export interface EquipoListDto {
  id: number;
  tipo: string;
  marca?: string;
  modelo?: string;
  nSerie?: string;
  capacidad?: string;
  propietarioEmpresaNombre?: string;
  proyectoId: number;
  proyectoNombre: string;
  estadoHabilitacion: string;
  activo: boolean;
}

export interface EquipoEntregableDto {
  id: number;
  itemId: number;
  nombreItem: string;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
  requiereVigencia: boolean;
}

export interface EquipoUpsertDto {
  tipo: string;
  marca?: string;
  modelo?: string;
  nSerie?: string;
  nVin?: string;
  capacidad?: string;
  propietarioEmpresaId?: number | null;
  proyectoId: number;
  emailAdmin?: string;
  emailSsoma?: string;
}

export interface EquipoEntregableUpdateDto {
  estado?: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
}
