export interface DashboardKpisDto {
  empresasTotal: number;
  empresasHabilitadas: number;
  workersTotal: number;
  workersHabilitados: number;
  entregablesVencidos: number;
}

export interface EmpresaRiesgoDto {
  empresaId: number;
  nombre: string;
  nivelRiesgo: string;
  entregablesVencidos: number;
  entregablesPorVencer: number;
  workersActivos: number;
}

export interface WorkerRiesgoDto {
  workerId: number;
  nombre: string;
  dni: string;
  empresa: string;
  proyecto: string;
  documentosVencidos: string[];
}

export interface ProyectoEstadoDto {
  proyectoId: number;
  nombre: string;
  empresasActivas: number;
  workersHabilitados: number;
  workersTotal: number;
}

export interface VencimientoProximoDto {
  tipo: string;
  entidad: string;
  nombre: string;
  fechaVencimiento: string;
  diasRestantes: number;
}

export interface DashboardAdminDto {
  kpis: DashboardKpisDto;
  empresasEnRiesgo: EmpresaRiesgoDto[];
  workersEnRiesgo: WorkerRiesgoDto[];
  estadoPorProyecto: ProyectoEstadoDto[];
  vencimientosProximos: VencimientoProximoDto[];
}
