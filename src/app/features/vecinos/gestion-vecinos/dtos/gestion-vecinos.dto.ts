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
  usos: CatalogOptionDTO[];
  relacionTipos: CatalogOptionDTO[];
}

/** Una imagen del estado de la propiedad. */
export interface VecinoImagenDTO {
  vecinoImagenId: number;
  archivoUrl: string;
  originalFileName?: string | null;
}

/** Una persona asociada a una casa/lote. */
export interface VecinoPersonaDTO {
  vecinoPersonaId: number;
  nombre: string;
  dni?: string | null;
  celular?: string | null;
  vecinoRelacionTipoId: number;
  relacionDescripcion: string;
}

export interface VecinoListItemDTO {
  vecinoId: number;
  projectId: number;
  projectDescription: string;
  predio?: string | null;
  vecinoUsoId?: number | null;
  usoDescripcion?: string | null;
  direccion: string;
  interiorDepartamento?: string | null;
  /** Nombre de la persona principal (propietario), para mostrar en tabla/tarjeta. */
  nombrePropietario?: string | null;
  /** DNI de la persona principal, si tiene. */
  dni?: string | null;
  celular?: string | null;
  /** Todas las personas asociadas a la casa. */
  personas: VecinoPersonaDTO[];
  vecinoColindanciaId: number;
  colindanciaDescripcion: string;
  vecinoTipoConstruccionId: number;
  tipoConstruccionDescripcion: string;
  observaciones?: string | null;
  imagenes: VecinoImagenDTO[];
  createdDateTime: string;
  solicitudesCount: number;
  compromisosCount: number;
  solicitudesAprobadas: number;
  solicitudesEvaluables: number;
  entregablesAprobados: number;
  entregablesEvaluables: number;
  requisitosSubidos: number;
  requisitosEvaluables: number;
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
  solicitudesCount: number;
  compromisosCount: number;
  solicitudesAprobadas: number;
  solicitudesEvaluables: number;
  entregablesAprobados: number;
  entregablesEvaluables: number;
  requisitosSubidos: number;
  requisitosEvaluables: number;
  lotes: CroquisGestionLoteDTO[];
  vecinos: VecinoListItemDTO[];
}

export interface CroquisGestionResponseDTO {
  croquis: CroquisGestionDTO[];
  projects: ProjectOptionDTO[];
  colindancias: CatalogOptionDTO[];
  tiposConstruccion: CatalogOptionDTO[];
  usos: CatalogOptionDTO[];
  relacionTipos: CatalogOptionDTO[];
}

// ── Requisitos (Gestión de requisitos) ────────────────────────────────────
export interface VecinoRequisitoItemDTO {
  vecinoRequisitoId: number | null;
  vecinoRequisitoTipoId: number;
  tipoDescripcion: string;
  orden: number;
  vecinoRequisitoEstadoId: number;
  estadoDescripcion: string;
  archivoUrl?: string | null;
  originalFileName?: string | null;
}

export interface VecinoRequisitosResponseDTO {
  requisitos: VecinoRequisitoItemDTO[];
  estados: CatalogOptionDTO[];
}

/** Una persona del formulario de alta (DNI opcional). */
export interface VecinoPersonaCreateDTO {
  nombre: string;
  dni: string;
  celular: string;
  vecinoRelacionTipoId: number | null;
}

export interface VecinoCreateDTO {
  projectId: number | null;
  vecinoUsoId: number | null;
  direccion: string;
  interiorDepartamento: string;
  vecinoColindanciaId: number | null;
  vecinoTipoConstruccionId: number | null;
  observaciones: string;
  personas: VecinoPersonaCreateDTO[];
}
