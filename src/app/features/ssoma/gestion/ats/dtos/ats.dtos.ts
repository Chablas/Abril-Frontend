export interface AtsProyectoDto {
  id: number;
  nombre: string;
}

export interface AtsPasoDto {
  id: number;
  texto: string;
  requierePetar: boolean;
}

export interface AtsPasoPuestoDto {
  pasoId: number;
  categoriaNombre: string;
  texto: string;
  puestoIds: number[];
}

/** Fila del listado del Coordinador SSOMA para subir la autorización física (permiso de
 *  trabajo firmado) de cada trabajador — sin esto no puede crear/editar un ATS. */
export interface AtsAutorizacionTrabajadorDto {
  workerId: number;
  nombre: string;
  dni?: string | null;
  proyectoId?: number | null;
  proyectoNombre?: string | null;
  obraOficinaStaff?: string | null;
  tieneFirmaDigital: boolean;
  tieneAutorizacion: boolean;
  subidoEn?: string | null;
  archivoUrl?: string | null;
  esCapatazOMaestro: boolean;
  emailPersonal?: string | null;
  tieneUsuario: boolean;
}

export interface AtsAutorizacionFirmaDigitalRequestDto {
  firmaBase64: string;
}

export interface AtsCategoriaPasoDto {
  id: number;
  nombre: string;
  pasos: AtsPasoDto[];
}

export interface AtsRiesgoDto {
  id: number;
  nombre: string;
  requierePetar: boolean;
}

export interface AtsPetarResumenDto {
  id: number;
  tipoNombre?: string;
  estado: string;
  tieneFirmaEjecutante: boolean;
  supervisorFirmado: boolean;
  ssomaFirmado: boolean;
  puedeFirmarSupervisor: boolean;
  puedeFirmarSsoma: boolean;
}

export interface AtsPeligroDto {
  id: number;
  nombre: string;
  riesgos: AtsRiesgoDto[];
}

export interface AtsEppDto {
  id: number;
  nombre: string;
  categoria: string;
}

export interface AtsHerramientaDto {
  id: number;
  nombre: string;
  categoria: string;
}

export interface AtsPuestoDto {
  id: number;
  nombre: string;
}

export interface AtsPlantillaDto {
  id: number;
  nombre: string;
  puestoId?: number;
  peligroIds: number[];
  eppIds: number[];
  herramientaIds: number[];
}

export interface AtsInitDto {
  proyectos: AtsProyectoDto[];
  proyectoActualId?: number;
  puestoId?: number;
  puestos: AtsPuestoDto[];
  pasos: AtsCategoriaPasoDto[];
  peligros: AtsPeligroDto[];
  epps: AtsEppDto[];
  herramientas: AtsHerramientaDto[];
  plantillas: AtsPlantillaDto[];
  plantillaSugeridaId?: number;
  tieneConsentimiento: boolean;
}

export type NivelRiesgo = 'A' | 'M' | 'B';

/** pasoId presente = viene del catálogo. pasoId ausente = paso "de una sola vez" escrito a mano
 *  para este ATS puntual (no se guarda en el catálogo) — ahí texto/categoriaNombre son obligatorios. */
export interface AtsPasoRequestDto {
  pasoId?: number;
  texto?: string;
  categoriaNombre?: string;
  aplica: boolean;
}

export interface AtsRiesgoDetalleRequestDto {
  peligroId: number;
  riesgoId: number;
  riesgoBase: NivelRiesgo;
  controles: string;
  riesgoResidual: NivelRiesgo;
}

export interface AtsGuardarRequestDto {
  proyectoId: number;
  plantillaId?: number;
  actividad: string;
  torreNombre?: string;
  pisos?: string;
  lugar?: string;
  pasos: AtsPasoRequestDto[];
  eppIds: number[];
  herramientaIds: number[];
  herramientasPersonalizadas: string[];
  riesgos: AtsRiesgoDetalleRequestDto[];
  /** Presente solo al crear un ATS como corrección de uno ya firmado el mismo día. */
  atsAnteriorId?: number;
}

export interface AtsFirmarVistoRequestDto {
  firmaBase64: string;
}

export interface AtsFirmarRequestDto {
  selfieBase64: string;
  firmaBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
  aceptaConsentimiento: boolean;
}

export interface AtsPasoResponseDto {
  pasoId?: number;
  categoriaNombre: string;
  texto: string;
  aplica: boolean;
}

export interface AtsRiesgoDetalleResponseDto {
  peligroId: number;
  riesgoId: number;
  peligroNombre: string;
  riesgoNombre: string;
  riesgoBase: NivelRiesgo;
  controles: string;
  riesgoResidual: NivelRiesgo;
}

export interface AtsResponseDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  proyectoId: number;
  proyectoNombre?: string;
  puestoId?: number;
  puestoNombre?: string;
  plantillaId?: number;
  actividad: string;
  torreNombre?: string;
  pisos?: string;
  lugar?: string;
  fecha: string;
  horaServidorFirma?: string;
  lat?: number;
  lng?: number;
  precisionMetros?: number;
  selfieUrl?: string;
  firmaUrl?: string;
  estado: 'Borrador' | 'Firmado';
  atsAnteriorId?: number;
  pdfHash?: string;
  requiereCapataz: boolean;
  atsGrupoId?: number;
  capatazNombre?: string;
  capatazCargo?: string;
  capatazFirmaUrl?: string;
  capatazHoraServidor?: string;
  autorizaNombre?: string;
  autorizaCargo?: string;
  autorizaFirmaUrl?: string;
  autorizaHoraServidor?: string;
  ssomaNombre?: string;
  ssomaCargo?: string;
  ssomaFirmaUrl?: string;
  ssomaHoraServidor?: string;
  puedeCapataz: boolean;
  puedeAutorizar: boolean;
  puedeVistoBuenoSsoma: boolean;
  requierePetar: boolean;
  petares: AtsPetarResumenDto[];
  pasos: AtsPasoResponseDto[];
  epps: string[];
  herramientas: string[];
  riesgos: AtsRiesgoDetalleResponseDto[];
}

export interface AtsFiltroDto {
  proyectoId?: number;
  workerId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  page?: number;
}

export interface AtsListResponseDto {
  data: AtsResponseDto[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface AtsPlantillaPuestoDto {
  plantillaId: number;
  plantillaNombre: string;
  puestoIds: number[];
}

export interface AtsPlantillaGuardarRequestDto {
  nombre: string;
  puestoId?: number;
  peligroIds: number[];
  eppIds: number[];
  herramientaIds: number[];
}

// ── Actividades/pasos por plantilla ─────────────────────────────────────────

export interface AtsPlantillaPasoDto {
  id: number;
  texto: string;
  orden: number;
}

export interface AtsPlantillaActividadDto {
  id: number;
  plantillaId: number;
  texto: string;
  orden: number;
  pasos: AtsPlantillaPasoDto[];
  peligroIds: number[];
}

export interface AtsPlantillaActividadGuardarRequestDto {
  texto: string;
}

export interface AtsPlantillaPasoGuardarRequestDto {
  texto: string;
}

export interface AtsPlantillaActividadPeligrosRequestDto {
  peligroIds: number[];
}

// ── Controles sugeridos por riesgo ──────────────────────────────────────────

export type TipoControl = 'Eliminacion' | 'Sustitucion' | 'Ingenieria' | 'Administrativo' | 'Epp';

/** Jerarquía de controles (de más a menos efectivo) — usada en los selects de tipo de control
 *  y para la advertencia de la matriz de riesgo (Alto→Bajo sin control de Ingeniería). */
export const TIPOS_CONTROL: { value: TipoControl; label: string }[] = [
  { value: 'Eliminacion', label: 'Eliminación' },
  { value: 'Sustitucion', label: 'Sustitución' },
  { value: 'Ingenieria', label: 'Ingeniería' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Epp', label: 'EPP' },
];

export interface AtsRiesgoControlDto {
  id: number;
  texto: string;
  orden: number;
  tipo: TipoControl;
}

export interface AtsRiesgoConControlesDto {
  riesgoId: number;
  riesgoNombre: string;
  peligroId: number;
  peligroNombre: string;
  controles: AtsRiesgoControlDto[];
}

export interface AtsRiesgoControlGuardarRequestDto {
  texto: string;
  tipo: TipoControl;
}

// ── ATS Grupal (cuadrilla) ───────────────────────────────────────────────────

export interface AtsGrupoCrearResponseDto {
  id: number;
  qrToken: string;
  qrExpiraEn: string;
}

export interface AtsGrupoEstadoDto {
  id: number;
  actividad: string;
  proyectoNombre?: string;
  torreNombre?: string;
  pisos?: string;
  fecha: string;
  estado: 'Activo' | 'Cerrado';
  qrToken: string;
  qrExpiraEn: string;
  totalAdhesiones: number;
  trabajadoresAdheridos: string[];
  capatazNombre?: string;
  capatazHoraServidor?: string;
  capatazVigente: boolean;
  capatazNuevosSinValidar: number;
}

export interface AtsGrupoCapatazPublicoDto {
  valido: boolean;
  motivoInvalido?: string;
  proyectoNombre?: string;
  actividad?: string;
  trabajadoresAdheridos: string[];
  yaFirmo: boolean;
  vigente: boolean;
  nuevosSinValidar: number;
  capataces: AtsGrupoWorkerOpcionDto[];
}

export interface AtsGrupoCapatazFirmarRequestDto {
  workerId: number;
  dniConfirmacion: string;
  firmaBase64: string;
  selfieBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
}

export interface AtsGrupoResumenPublicoDto {
  valido: boolean;
  motivoInvalido?: string;
  proyectoNombre?: string;
  actividad?: string;
  torreNombre?: string;
  pisos?: string;
  lugar?: string;
  fecha?: string;
  epps: string[];
  herramientas: string[];
  riesgos: AtsRiesgoDetalleResponseDto[];
}

export interface AtsGrupoWorkerOpcionDto {
  workerId: number;
  nombre: string;
  dniUltimos4?: string;
}

export interface AtsGrupoUnirseRequestDto {
  workerId: number;
  dniConfirmacion: string;
  selfieBase64: string;
  firmaBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
  aceptaConsentimiento: boolean;
}

// ── QR fijo por proyecto — crear ATS Grupal sin login ─────────────────────────

export interface AtsGrupoProyectoPublicoDto {
  valido: boolean;
  motivoInvalido?: string;
  proyectoNombre?: string;
  trabajadores: AtsGrupoWorkerOpcionDto[];
}

export interface AtsGrupoInitPublicoRequestDto {
  workerId: number;
  dniConfirmacion: string;
}

export interface AtsGrupoCrearPublicoRequestDto {
  workerId: number;
  dniConfirmacion: string;
  contenido: AtsGuardarRequestDto;
}
