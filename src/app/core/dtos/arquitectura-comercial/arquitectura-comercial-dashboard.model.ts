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
  userId: number;
  nombre: string;
  progreso: number;
  total: number;
  completadas: number;
  /** Actividades vencidas de semanas anteriores que el supervisor aún arrastra sin cerrar.
   * Informativo — ya no penaliza el IES (que ahora solo mide la semana en control). */
  deudaAnterior: number;
  /** true si no tenía nada que vencer ni arrancar esta semana — no entra al IES ni al promedio. */
  sinCompromisos: boolean;
  /** Componente SPI del IES (35%): ritmo real vs. planificado de lo que debía cerrar. */
  compSpi: number;
  /** Componente tasa de cierre del IES (35%): % de lo que debía cerrar esta semana y cerró. */
  compCierre: number;
  /** Componente puntualidad de inicio del IES (20%): % de lo que debía arrancar y arrancó a tiempo. */
  compInicio: number;
  /** Motivos concretos por los que el IES no llegó a 100%. */
  motivos: string[];
}

export interface SupervisorHistoricoDTO {
  nombre: string;
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  eficienciaHistorica: number;
  spiPromedio: number;
  tendenciaSemanal: EficienciaSemanalDTO[];
  tendenciaCarga: CargaSemanalDTO[];
}

/** Carga ponderada de una semana puntual (+ promedio del equipo esa misma semana),
 * para ver si la sobrecarga de un supervisor es puntual o un patrón repetido. */
export interface CargaSemanalDTO {
  semana: string;
  total: number;
  totalPonderado: number;
  promedioEquipo: number;
  /** SOBRECARGADO | NORMAL | DISPONIBLE */
  tag: string;
}

export interface HitoCriticoDTO {
  id: number;
  nombre: string;
  proyecto: string;
  fechaLimite: string;
  diasRestantes: number;
  estado: string;
  semana: number;
}

export interface SemanaDashboardDTO {
  numero: number;
  label: string;
  inicio: string;
  fin: string;
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
  proximosPorProyecto         : ProximoPorProyectoDTO[];
  eficienciaConsultas         : EficienciaConsultaSemanalDTO[];
  ganttHitos                  : GanttMiniItemDTO[];
  ganttEntregables            : GanttMiniItemDTO[];
  categorias                  : CategoriaItemDTO[];
  distribucionPorCategoria    : CategoriaDashboardItemDTO[];
  distribucionTipos           : ChartItemDTO[];
  semanaActual                : SemanaDashboardDTO;
  rangoUltimasSemanas         : string;
}

export interface TareasPorArquitectoDTO {
  userId      : number;
  nombre      : string;
  hitos       : number;
  entregables : number;
  consultas   : number;
  total       : number;
  /** Carga ponderada por tipo (Hito/Entregable pesan más que una Consulta) — esto, y no
   * `total`, es lo que clasifica Sobrecargado/Normal/Disponible. */
  totalPonderado: number;
  avancePct   : number;
}

/** Entregables e Hitos con vencimiento en los próximos 14 días, agrupados por proyecto —
 * reemplaza a la antigua "Curva de Avance": qué vence, en qué proyecto, en 1-2 semanas. */
export interface ProximoPorProyectoDTO {
  proyectoId    : number;
  proyectoNombre: string;
  entregables   : number;
  hitos         : number;
}

/** Tasa de cierre semanal (últimas 8 semanas) SOLO de Consultas — una Consulta no es lo mismo
 * que un Hito/Entregable, se mide aparte en vez de mezclarse en un SPI general.
 * null = no había consultas venciendo esa semana (no es 0%). */
export interface EficienciaConsultaSemanalDTO {
  semana     : string;
  tasaCierre : number | null;
  spiPromedio: number | null;
}

export interface CategoriaItemDTO {
  id    : number;
  nombre: string;
}

/** Fila de la mini-línea de tiempo de Hitos/Entregables (todos los proyectos, próximos 3
 * meses) — reemplaza a la tarjeta plana de "Hitos Críticos". */
export interface GanttMiniItemDTO {
  id              : number;
  nombre          : string;
  proyecto        : string;
  inicioProgramado: string | null;
  finProgramado   : string | null;
  inicioEfectivo  : string | null;
  finEfectivo     : string | null;
  estado          : string;
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
