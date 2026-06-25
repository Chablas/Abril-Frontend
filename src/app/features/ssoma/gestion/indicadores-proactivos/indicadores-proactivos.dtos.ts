// ─── Tipos de Inspección ───────────────────────────────────────────────────

export interface InspeccionTipoDto {
  id: number;
  nombre: string;
}

// ─── Programación de Inspecciones ──────────────────────────────────────────

export interface EmpresaProgInspeccionDto {
  empresaId: number | null;
  empresaTipo: 'Casa' | 'Contratista';
  empresaNombre: string;
  tiposAplicables: number[];
}

export interface ProgInspeccionResumenDto {
  proyectoId: number;
  mes: number;
  anio: number;
  empresas: EmpresaProgInspeccionDto[];
}

export interface GuardarProgInspeccionRequest {
  proyectoId: number;
  mes: number;
  anio: number;
  empresaId: number | null;
  empresaTipo: 'Casa' | 'Contratista';
  tiposAplicables: number[];
}

// ─── Meta por Empresa ───────────────────────────────────────────────────────

export interface MetaEmpresaDto {
  empresaId: number | null;
  empresaTipo: string;
  empresaNombre: string;
  promedioTrabajadores: number;
  diasLaborados: number;
  esActiva: boolean;

  metaRacs: number;
  metaOpt: number;
  metaAts: number;
  metaCharlas: number;
  metaInspecciones: number;

  actualRacs: number;
  actualRacsCerrados: number;
  actualOpt: number;
  actualAts: number;
  actualCharlas: number;
  actualInspecciones: number;

  pctRacs: number;
  pctRacsCerrados: number;
  pctOpt: number;
  pctAts: number;
  pctCharlas: number;
  pctInspecciones: number;
  pctProactivoGeneral: number;
}

// ─── Indicadores por Proyecto (Dashboard de Seguimiento) ───────────────────

export interface IndicadorProactivoProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  totalEmpresasActivas: number;

  metaRacsTotal: number;
  metaOptTotal: number;
  metaAtsTotal: number;
  metaCharlasTotal: number;
  metaInspeccionesTotal: number;

  actualRacsTotal: number;
  actualRacsCerradosTotal: number;
  actualOptTotal: number;
  actualAtsTotal: number;
  actualCharlasTotal: number;
  actualInspeccionesTotal: number;

  pctRacs: number;
  pctRacsCerrados: number;
  pctOpt: number;
  pctAts: number;
  pctCharlas: number;
  pctInspecciones: number;
  pctProactivoGeneral: number;

  empresas: MetaEmpresaDto[];
}

// ─── Puntaje del Mes ────────────────────────────────────────────────────────

export interface PuntajeMesDto {
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;

  pctProactivos: number;
  pctPasso: number;
  pctCierreAccidentes: number;
  pctCierreHallazgos: number;

  puntajeProactivos: number;
  puntajePasso: number;
  puntajeCierreAccidentes: number;
  puntajeCierreHallazgos: number;
  bonusProactivos: number;
  puntajeTotal: number;

  accidentesAbiertos: number;
  accidentesTotales: number;
  hallazgosCerrados: number;
  hallazgosTotales: number;
}
