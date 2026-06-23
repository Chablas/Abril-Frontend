// ── Catálogos ─────────────────────────────────────────────────────────────────

export interface CatalogoItemDto {
  id: number;
  nombre: string;
  codigo?: string;
}

export interface FlashProyectoDto {
  id: number;
  nombre: string;
  abreviatura?: string;
  emailCoordSsoma?: string;
}

export interface ContratistaCatalogoDto {
  id: number;
  razonSocial: string;
  ruc?: string;
}

export interface TrabajadorCatalogoDto {
  id: number;
  nombreCompleto: string;
  documento?: string;
  cargo?: string;
}

export interface FlashReportInicializarDto {
  proyectos: FlashProyectoDto[];
  tipos: CatalogoItemDto[];
  etapasProyecto: CatalogoItemDto[];
  partesAfectadas: CatalogoItemDto[];
  empresasAbril: CatalogoItemDto[];
  partidas: CatalogoItemDto[];
  contratistas: ContratistaCatalogoDto[];
  trabajadores: TrabajadorCatalogoDto[];
}

// ── Lista ─────────────────────────────────────────────────────────────────────

export interface FlashReportListItemDto {
  id: number;
  codigo: string;
  proyectoNombre: string;
  fecha: string;
  tipoNombre: string;
  tipoCodigo: string;
  trabajadorNombre?: string;
  estado: string;
  enviado: boolean;
  fechaEnvio?: string;
  consecuenciaRealPersonal?: number;
}

// ── Detalle ───────────────────────────────────────────────────────────────────

export interface DescansoDto {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  observacion?: string;
  diasDescanso: number;
}

export interface FlashReportDetalleDto {
  id: number;
  codigo: string;
  proyectoId: number;
  proyectoNombre: string;
  proyectoAbreviatura?: string;
  tipoId: number;
  tipoNombre: string;
  tipoCodigo: string;
  fecha: string;
  hora?: string;
  lugarExacto: string;
  descripcion: string;
  estado: string;

  empresaAbrilId?: number;
  empresaAbrilNombre?: string;
  contributorId?: number;
  contributorNombre?: string;
  jefeInmediatoNombre?: string;

  etapaProyectoId?: number;
  etapaProyectoNombre?: string;
  partidaId?: number;
  partidaNombre?: string;

  workerId?: number;
  trabajadorNombre?: string;
  puestoTrabajo?: string;
  edad?: number;
  aniosExperiencia?: number;
  celularTrabajador?: string;
  parteAfectadaId?: number;
  parteAfectadaNombre?: string;

  danoProceso?: string;
  consecuenciaRealPersonal?: number;
  consecuenciaPotencialPersonal?: number;
  accionesInmediatas?: string;

  elaboradoPorId?: number;
  elaboradoPorNombre?: string;
  elaboradoPorCargo?: string;
  elaboradoPorEmail?: string;
  elaboradoPorTelefono?: string;

  urlFoto1?: string;
  urlFoto2?: string;

  enviado: boolean;
  fechaEnvio?: string;
  urlPdfSharepoint?: string;

  descansos: DescansoDto[];
  createdAt: string;
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface DescansoRequest {
  fechaInicio: string;
  fechaFin: string;
  observacion?: string;
}

export interface CrearFlashReportRequest {
  proyectoId: number;
  tipoId: number;
  fecha: string;
  hora?: string;
  lugarExacto: string;
  descripcion: string;

  empresaAbrilId?: number;
  contributorId?: number;
  jefeInmediatoNombre?: string;

  etapaProyectoId?: number;
  partidaId?: number;

  workerId?: number;
  trabajadorNombre?: string;
  puestoTrabajo?: string;
  edad?: number;
  aniosExperiencia?: number;
  celularTrabajador?: string;
  parteAfectadaId?: number;

  danoProceso?: string;
  consecuenciaRealPersonal?: number;
  consecuenciaPotencialPersonal?: number;
  accionesInmediatas?: string;

  elaboradoPorNombre?: string;
  elaboradoPorCargo?: string;
  elaboradoPorEmail?: string;
  elaboradoPorTelefono?: string;

  foto1Base64?: string;
  foto2Base64?: string;

  descansos: DescansoRequest[];
}

export type ActualizarFlashReportRequest = CrearFlashReportRequest;

// Aliases legacy
export type AccidenteIncidenteListItemDto = FlashReportListItemDto;
export type AccidenteIncidenteDetalleDto = FlashReportDetalleDto;
export type CrearAccidenteIncidenteRequest = CrearFlashReportRequest;
export type ActualizarAccidenteIncidenteRequest = ActualizarFlashReportRequest;
export interface SubirDocumentoRequest { nombreArchivo: string; tipoArchivo: string; contenidoBase64: string; tamanioBytes?: number; }
export interface DocumentoAdjuntoDto { id: number; nombreArchivo: string; urlSharepoint: string; tipoArchivo: string; tamanioBytes: number; createdAt: string; }

export const NIVELES_CONSECUENCIA = [
  '', '1 - Sin daño', '2 - Lesión leve', '3 - Lesión con tiempo perdido',
  '4 - Lesión grave', '5 - Fatalidad simple', '6 - Fatalidad múltiple'
];
