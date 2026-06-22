export interface ProyectoInfo {
  proyectoId: number;
  nombre: string;
}

export interface Staff {
  workerId: number;
  nombreCompleto: string;
  cargo: string;
}

export interface CharlaResumen {
  id: number;
  fecha: string;
  titulo: string;
  tema: string;
  duracionHoras: number;
  totalAsistentes: number;
  asistentesIds: number[];
}

export interface AsistenciaDetail {
  workerId: number;
  nombreCompleto: string;
  asistio: boolean;
}

export interface Capacitacion {
  id: number | null;
  workerId: number;
  nombreCompleto: string;
  fecha: string | null;
  tema: string | null;
  evidenciaUrl: string | null;
  evidenciaNombre: string | null;
  estado: 'Falta' | 'Enviado' | 'Aprobado' | 'Rechazado';
}

export interface Resumen {
  totalCharlas: number;
  totalAsistencias: number;
  capsTotal: number;
  capsFalta: number;
  capsEnviado: number;
  capsAprobado: number;
  capsRechazado: number;
}

export interface CrearCharlaDto {
  fecha: string;
  titulo: string;
  tema: string;
  duracionHoras: number;
  proyectoId: number;
}

export interface GuardarAsistenciaDto {
  workerIds: number[];
}
