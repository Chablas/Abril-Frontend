import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';

export interface ProjectOptionDTO {
  projectId: number;
  projectDescription: string;
}

export interface CatalogOptionDTO {
  id: number;
  descripcion: string;
}

export interface VecinoFormOptionsDTO {
  projects: ProjectOptionDTO[];
  colindancias: CatalogOptionDTO[];
  tiposConstruccion: CatalogOptionDTO[];
}

export interface VecinoListItemDTO {
  vecinoId: number;
  projectId: number;
  projectDescription: string;
  predio?: string | null;
  direccion: string;
  interiorDepartamento?: string | null;
  nombrePropietario: string;
  dni: string;
  celular?: string | null;
  vecinoColindanciaId: number;
  colindanciaDescripcion: string;
  vecinoTipoConstruccionId: number;
  tipoConstruccionDescripcion: string;
  createdDateTime: string;
}

export interface VecinosPageDTO {
  options: VecinoFormOptionsDTO;
  vecinos: PagedResponseDTO<VecinoListItemDTO>;
}

export interface VecinoSolicitudItemDTO {
  vecinoSolicitudId: number;
  vecinoId: number;
  descripcion: string;
  esCritica: boolean;
  vecinoSolicitudEstadoId: number;
  estadoDescripcion: string;
  createdDateTime: string;
}

export interface VecinoSolicitudesResponseDTO {
  solicitudes: VecinoSolicitudItemDTO[];
  estados: CatalogOptionDTO[];
  compromisoEstados: CatalogOptionDTO[];
  entregableEstados: CatalogOptionDTO[];
}

export interface VecinoEntregableItemDTO {
  vecinoCompromisoEntregableId: number;
  vecinoEntregableTipoId: number;
  tipoDescripcion: string;
  orden: number;
  vecinoEntregableEstadoId: number;
  estadoDescripcion: string;
}

export interface VecinoCompromisoItemDTO {
  vecinoCompromisoId: number;
  vecinoSolicitudId: number;
  descripcion: string;
  esCritico: boolean;
  vecinoCompromisoEstadoId: number;
  estadoDescripcion: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  createdDateTime: string;
  entregables: VecinoEntregableItemDTO[];
}

export interface VecinoCompromisoCreateDTO {
  descripcion: string;
  esCritico: boolean;
  vecinoCompromisoEstadoId?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export interface VecinoSolicitudCreateDTO {
  descripcion: string;
  esCritica: boolean;
}

// ── Vista por croquis ────────────────────────────────────────────────────
export interface CroquisGestionLoteDTO {
  projectCroquisLoteId: number;
  numeroLote: string;
  puntos: number[][];
  vecinoId?: number | null;
  vecinoNombre?: string | null;
}

export interface CroquisGestionDTO {
  projectId: number;
  projectDescription: string;
  projectCroquisId: number;
  imageUrl: string;
  lotes: CroquisGestionLoteDTO[];
  vecinos: VecinoListItemDTO[];
}

export interface CroquisGestionResponseDTO {
  croquis: CroquisGestionDTO[];
  projects: ProjectOptionDTO[];
  colindancias: CatalogOptionDTO[];
  tiposConstruccion: CatalogOptionDTO[];
}

export interface VecinoCreateDTO {
  projectId: number | null;
  predio?: string | null;
  direccion: string;
  interiorDepartamento?: string | null;
  nombrePropietario: string;
  dni: string;
  celular?: string | null;
  vecinoColindanciaId: number | null;
  vecinoTipoConstruccionId: number | null;
}
