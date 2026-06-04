// Dashboard
export interface PasoDashboardDto {
  anioActual: number;
  totalProgramas: number;
  programasActivos: number;
  spiConsolidado: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvanceConsolidado: number;
  totalVencidas: number;
  totalProximasVencer: number;
  porProyecto: PasoPorProyectoDto[];
  seguridad?: SpiPorAmbitoDto;
  salud?: SpiPorAmbitoDto;
  ambiente?: SpiPorAmbitoDto;
}

export interface PasoPorProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  pasoId: number;
  spi: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvance: number;
  vencidas: number;
}

// Alertas
export interface PasoAlertaDto {
  ejecucionId: number;
  actividadId: number;
  actividadNombre: string;
  pasoId: number;
  pasoNombre: string;
  proyectoNombre: string | null;
  fechaProgramada: string;
  tipoAlerta: 'Vencido' | 'ProximaAVencer';
  responsableNombre: string | null;
}

// SPI
export interface PasoSpiDto {
  spiGeneral: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvance: number;
  planificadasAHoy: number;
  ejecutadasAHoy: number;
  totalProgramadas: number;
  totalEjecutadas: number;
  totalVencidas: number;
  proximasAVencer: number;
  seguridad: SpiPorAmbitoDto;
  salud: SpiPorAmbitoDto;
  ambiente: SpiPorAmbitoDto;
  ssoma?: SpiPorAmbitoDto;
}

export interface SpiPorAmbitoDto {
  spi: number;
  color: 'verde' | 'amarillo' | 'rojo';
  planificadas: number;
  ejecutadas: number;
  vencidas: number;
}

// Lista (paginada)
export interface PasoListItemDto {
  id: number;
  proyectoId: number | null;
  proyectoNombre: string | null;
  plantillaId: number | null;
  nombre: string;
  anio: number;
  mesInicio: number;
  esPlantilla: boolean;
  estado: 'Borrador' | 'Aprobado' | 'Activo' | 'Cerrado';
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  createdAt: string;
  totalActividades: number;
  totalPlanificadas: number;
  totalEjecutadas: number;
  totalVencidas: number;
  spi: number;
  porcentajeAvance: number;
}

export interface PagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Detalle
export interface PasoDetalleDto extends PasoListItemDto {
  actividades: PasoActividadDto[];
}

// Actividad
export interface PasoActividadDto {
  id: number;
  pasoId: number;
  categoriaId: number;
  categoriaNombre: string;
  categoriaAmbito: 'Seguridad' | 'Salud' | 'Ambiente';
  categoriaIcono?: string;
  nombre: string;
  descripcion: string | null;
  alcance: string | null;
  frecuencia: 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Unica';
  responsableId: number | null;
  responsableNombre: string | null;
  responsableTexto: string | null;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
  horas: number | null;
  recursos: string | null;
  indicador: string;
  meta: string;
  orden: number | null;
  activo: boolean;
  ejecucionesTotal: number;
  ejecucionesCompletadas: number;
  ejecucionesVencidas: number;
  spi: number;
  ejecuciones: PasoEjecucionDto[];
}

// Ejecución
export interface PasoEjecucionDto {
  id: number;
  actividadId: number;
  fechaProgramada: string;
  fechaVerificacion: string | null;
  fechaEjecutada: string | null;
  fechaReprogramada: string | null;
  motivoReprogramacion: string | null;
  estado: 'Programado' | 'Ejecutado' | 'Vencido' | 'Cancelado' | 'Reprogramado';
  observaciones: string | null;
  participantesCount: number | null;
  evidenciaNombre: string | null;
  evidenciaUrl: string | null;
  evidenciaSpId: string | null;
  registradoPorNombre: string | null;
  createdAt: string;
}

// Gantt
export interface GanttItemDto {
  id: number;
  nombre: string;
  ambito: string;
  frecuencia: string;
  mesInicio: number;
  mesFin: number;
  responsableNombre: string | null;
  meses: GanttMesDto[];
}

export interface GanttMesDto {
  mes: number;
  planificado: boolean;
  estado: string;
  ejecucionId: number | null;
}

// Categoría
export interface PasoCategoriaDto {
  id: number;
  nombre: string;
  ambito: 'Seguridad' | 'Salud' | 'Ambiente';
  icono: string | null;
  activo: boolean;
}

// Requests
export interface CreatePasoDto {
  proyectoId?: number;
  nombre: string;
  anio: number;
  mesInicio?: number;
  esPlantilla: boolean;
}

export interface InstanciarPasoDto {
  proyectoId: number;
  nombre: string;
  anio: number;
  mesInicio?: number;
}

export interface CreateActividadDto {
  pasoId: number;
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  alcance?: string;
  frecuencia: string;
  responsableId?: number;
  responsableTexto?: string;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
  horas?: number;
  recursos?: string;
  indicador?: string;
  meta?: string;
  orden?: number;
}

export interface CreateEjecucionDto {
  actividadId: number;
  fechaProgramada?: string;
  fechaEjecutada: string;
  fechaVerificacion?: string;
  observaciones?: string;
  participantesCount?: number;
}
