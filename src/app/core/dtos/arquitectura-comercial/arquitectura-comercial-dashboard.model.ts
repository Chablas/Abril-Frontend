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
  id: number;
  nombre: string;
  proyecto: string;
  fechaLimite: string;
  diasRestantes: number;
  estado: string;
}

export interface CategoriaDashboardItemDTO {
  id: number;
  nombre: string;
  total: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  progreso: number;
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
  tareasPorArquitectoDetalle  : TareasPorArquitectoDTO[];
  avanceSemanal               : AvanceSemanalDTO[];
  eficienciaSpi               : EficienciaSpiDTO[];
  categorias                  : CategoriaItemDTO[];
  distribucionPorCategoria    : CategoriaDashboardItemDTO[];
}

export interface TareasPorArquitectoDTO {
  userId      : number;
  nombre      : string;
  hitos       : number;
  entregables : number;
  consultas   : number;
  total       : number;
  avancePct   : number;
}

export interface AvanceSemanalDTO {
  semana     : string;
  programado : number;
  real       : number;
}

export interface EficienciaSpiDTO {
  semana: string;
  spi   : number;
}

export interface CategoriaItemDTO {
  id    : number;
  nombre: string;
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
