export interface PetarItemDto {
  id: number;
  texto: string;
}

export interface PetarTipoDto {
  id: number;
  nombre: string;
  codigo?: string;
  items: PetarItemDto[];
}

export interface PetarInitDto {
  atsId: number;
  atsLugar?: string;
  atsActividad?: string;
  tipos: PetarTipoDto[];
}

export type RespuestaChecklist = 'SI' | 'NO' | 'NA';

export interface PetarItemRespuestaRequestDto {
  itemId: number;
  respuesta: RespuestaChecklist;
}

export interface PetarIzajeGruaDto {
  tipoGrua?: 'TorreGrua' | 'GruaMovil';
  fabricanteOMarca?: string;
  modeloOPlaca?: string;
  serieOTarjetaCirculacion?: string;
  longitudPlumaBrazoM?: number;
  radioMaximoGiroM?: number;
  direccionGradoGiro?: string;
  elevacionM?: number;
  anguloPluma?: number;
  capacidadCertificadaTon?: number;
  pesoCargaTotalTon?: number;
  porcentajeCapacidad?: number;
  tamanoEstrobo?: string;
  observaciones?: string;
}

export interface PetarGuardarRequestDto {
  atsId: number;
  tipoId: number;
  descripcionTrabajo: string;
  lugar?: string;
  horaInicio?: string;
  horaFin?: string;
  respuestas: PetarItemRespuestaRequestDto[];
  izajeGrua?: PetarIzajeGruaDto;
}

export interface PetarFirmarRequestDto {
  selfieBase64: string;
  firmaBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
}

export interface PetarFirmarVistoRequestDto {
  firmaBase64: string;
}

export interface PetarCerrarRequestDto {
  firmaBase64: string;
  observaciones?: string;
}

export interface PetarItemRespuestaResponseDto {
  itemId: number;
  texto: string;
  respuesta: RespuestaChecklist;
}

export interface PetarResponseDto {
  id: number;
  atsId: number;
  tipoId: number;
  tipoNombre?: string;
  tipoCodigo?: string;
  workerId: number;
  workerNombre?: string;
  proyectoId: number;
  proyectoNombre?: string;
  descripcionTrabajo: string;
  lugar?: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  horaServidorFirma?: string;
  lat?: number;
  lng?: number;
  precisionMetros?: number;
  selfieUrl?: string;
  firmaUrl?: string;
  supervisorNombre?: string;
  supervisorCargo?: string;
  supervisorFirmaUrl?: string;
  supervisorHoraServidor?: string;
  ssomaNombre?: string;
  ssomaCargo?: string;
  ssomaFirmaUrl?: string;
  ssomaHoraServidor?: string;
  estado: 'Borrador' | 'Firmado' | 'Cerrado';
  cierreHoraServidor?: string;
  cierreObservaciones?: string;
  cierreFirmaUrl?: string;
  pdfHash?: string;
  puedeFirmarSupervisor: boolean;
  puedeFirmarSsoma: boolean;
  puedeCerrar: boolean;
  respuestas: PetarItemRespuestaResponseDto[];
  izajeGrua?: PetarIzajeGruaDto;
}

export interface PetarFiltroDto {
  proyectoId?: number;
  workerId?: number;
  atsId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  page?: number;
}

export interface PetarListResponseDto {
  data: PetarResponseDto[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

// ── PETAR Grupal ─────────────────────────────────────────────────────────────

export interface PetarGrupoCrearRequestDto {
  atsGrupoId: number;
  tipoId: number;
  descripcionTrabajo: string;
  lugar?: string;
  horaInicio?: string;
  horaFin?: string;
  respuestas: PetarItemRespuestaRequestDto[];
}

export interface PetarGrupoCrearResponseDto {
  id: number;
}

export interface PetarGrupoEstadoDto {
  id: number;
  proyectoId: number;
  tipoNombre?: string;
  descripcionTrabajo: string;
  estado: 'Activo' | 'Cerrado';
  supervisorFirmado: boolean;
  ssomaFirmado: boolean;
  puedeFirmarSupervisor: boolean;
  puedeFirmarSsoma: boolean;
  totalAdhesiones: number;
  trabajadoresAdheridos: string[];
}

export interface PetarGrupoResumenPublicoDto {
  id: number;
  tipoNombre?: string;
  descripcionTrabajo: string;
  lugar?: string;
  horaInicio?: string;
  horaFin?: string;
  respuestas: PetarItemRespuestaResponseDto[];
}

export interface PetarGrupoUnirseRequestDto {
  atsToken: string;
  workerId: number;
  atsIdPropio: number;
  selfieBase64: string;
  firmaBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
}
