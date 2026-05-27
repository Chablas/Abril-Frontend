export interface EmpresaSimpleDto {
  id: number;
  razonSocial: string;
  nombreComercial?: string;
  logoUrl?: string;
}

export interface EmpresaContratistaListDto {
  id: number;
  razonSocial: string;
  nombreComercial?: string;
  ruc?: string;
  tipo: string;
  activo: boolean;
  emailAdmin?: string;
  emailSsoma?: string;
  logoUrl?: string;
  rubro?: string;
}

export interface EmpresaContratistaDetalleDto extends EmpresaContratistaListDto {
  direccion?: string;
  emailGerente?: string;
  emailResidente?: string;
  partidaRegistral?: string;
  activoRetirado?: string;
  proyectoId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmpresaContratistaCreateDto {
  razonSocial: string;
  nombreComercial?: string;
  ruc?: string;
  rubro?: string;
  direccion?: string;
  password: string;
  emailGerente?: string;
  emailAdmin?: string;
  emailResidente?: string;
  emailSsoma?: string;
  logoUrl?: string;
  partidaRegistral?: string;
  tipo: string;
  activo: boolean;
}

export interface ContratistaLoginDto {
  empresaId: number;
  password: string;
}

export interface ContratistaTokenDto {
  token: string;
  empresaId: number;
  razonSocial: string;
  tipo: string;
  allowedFeatures: string[];
}

export interface EmpresaEntregableDto {
  id: number;
  itemId: number;
  nombreItem: string;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
  requiereVigencia: boolean;
  responsable: string;
  mes?: number;
  anio?: number;
}

export interface EmpresaEntregableUpdateDto {
  estado?: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
}

export interface EmpresaProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
}

export interface ProyectoDisponibleDto {
  id: number;
  nombre: string;
  estaActiva: boolean;
  fechaInicio?: string;
}
