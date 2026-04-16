export interface ArqComercialKpiDTO {
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  eficienciaMedia: number;
  progresoGlobal: number;
}

export interface ArqComercialAlertDTO {
  vencidasSinCerrar: number;
  vencenEstaSemana: number;
  arrancanEstaSemana: number;
  hitosProximos14Dias: number;
}

export interface ChartItemDTO {
  label: string;
  value: number;
}

export interface ProyeccionAvanceDTO {
  labels: string[];
  programado: number[];
  real: number[];
}

export interface EficienciaSemanalDTO {
  semana: string;
  valor: number;
}

export interface SupervisorProgresoDTO {
  nombre: string;
  progreso: number;
  total: number;
  completadas: number;
}

export interface HitoCriticoDTO {
  nombre: string;
  proyecto: string;
  fechaLimite: string;
  diasRestantes: number;
  estado: string;
}

export interface ArqComercialDashboardDTO {
  kpis: ArqComercialKpiDTO;
  alertas: ArqComercialAlertDTO;
  proyeccionAvance: ProyeccionAvanceDTO;
  rankingEficiencia: ChartItemDTO[];
  distribucionEstado: ChartItemDTO[];
  tendenciaEficiencia: EficienciaSemanalDTO[];
  supervisores: SupervisorProgresoDTO[];
  hitosCriticos: HitoCriticoDTO[];
}

export interface ArqComercialFiltersDTO {
  semanas: { value: string; label: string }[];
  meses: { value: string; label: string }[];
  proyectos: { id: number; nombre: string }[];
}

export interface ArqComercialSelectedFilters {
  semana: string | null;
  mes: string | null;
  proyectoId: number;
}
