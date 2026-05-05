export interface SsItemTrabajadorDto {
  id: number;
  nombre: string;
  aplicaA: string;
  responsable: string;
  requiereVigencia: boolean;
  esSctrVidaley: boolean;
  orden: number;
  activo: boolean;
}

export interface SsItemEmpresaDto {
  id: number;
  nombre: string;
  responsable: string;
  orden: number;
  requiereVigencia: boolean;
  activo: boolean;
}

export interface ReglaDto {
  id: number;
  itemId: number;
  nombreItem?: string;
  categoriaId?: number;
  tipoTrabajador?: string;
  requerido: boolean;
  evaluadorRol?: string;
  nota?: string;
  activo: boolean;
}

export interface AreaCatDto {
  area: string;
}

export interface SubareaCatDto {
  id?: number;
  subarea: string;
  area: string;
  jefatura: string;
}
