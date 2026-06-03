export interface PasoDto {
  id: number;
  proyectoId: number | null;
  proyectoNombre: string | null;
  plantillaId: number | null;
  nombre: string;
  anio: number;
  esPlantilla: boolean;
  estado: 'Borrador' | 'Aprobado' | 'Activo' | 'Cerrado';
  aprobadoPor: number | null;
  aprobadoEn: string | null;
  createdAt: string;
  actividades?: PasoActividadDto[];
}

export interface PasoActividadDto {
  id: number;
  pasoId: number;
  categoriaId: number;
  categoriaNombre: string;
  categoriaAmbito: 'Seguridad' | 'Salud' | 'Ambiente';
  nombre: string;
  descripcion: string | null;
  frecuencia: 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Unica';
  responsableId: number | null;
  responsableNombre: string | null;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
  orden: number | null;
  activo: boolean;
  ejecuciones?: PasoEjecucionDto[];
}

export interface PasoEjecucionDto {
  id: number;
  actividadId: number;
  fechaProgramada: string;
  fechaEjecutada: string | null;
  estado: 'Programado' | 'Ejecutado' | 'Vencido' | 'Cancelado';
  observaciones: string | null;
  participantesCount: number | null;
  evidenciaNombre: string | null;
  evidenciaUrl: string | null;
  registradoPor: number | null;
  createdAt: string;
}

export interface PasoSpiDto {
  planificadasHoy: number;
  ejecutadasHoy: number;
  spi: number;
  spiColor: 'success' | 'warning' | 'danger';
  avancePorcentaje: number;
  totalAnio: number;
  ejecutadasTotal: number;
  vencidas: number;
}

export interface PasoDashboardDto {
  proyectos: {
    proyectoId: number;
    proyectoNombre: string;
    spi: PasoSpiDto;
  }[];
  consolidado: PasoSpiDto;
  alertas: PasoAlertaDto[];
}

export interface PasoAlertaDto {
  ejecucionId: number;
  actividadNombre: string;
  proyectoNombre: string;
  fechaProgramada: string;
  diasVencido: number;
  tipo: 'Vencida' | 'ProximaVencer';
}

export interface PasoGanttDto {
  tasks: {
    id: number;
    text: string;
    start_date: string;
    end_date: string;
    progress: number;
    parent?: number;
    open?: boolean;
  }[];
}

export interface CreatePasoDto {
  proyectoId?: number;
  nombre: string;
  anio: number;
  esPlantilla: boolean;
}

export interface InstanciarPasoDto {
  proyectoId: number;
  anio: number;
  nombre: string;
}

export interface CreateActividadDto {
  pasoId: number;
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  frecuencia: string;
  responsableId?: number;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
}

export interface CreateEjecucionDto {
  actividadId: number;
  fechaEjecutada: string;
  observaciones?: string;
  participantesCount?: number;
}

export interface PasoCategoriaDto {
  id: number;
  nombre: string;
  ambito: 'Seguridad' | 'Salud' | 'Ambiente';
  icono: string;
  activo: boolean;
}
