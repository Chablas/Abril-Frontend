export interface MiSaludResumenDto {
  workerId: number;
  workerNombre: string | null;
  tieneEmo: boolean;
  emoId: number | null;
  tipoEmo: string | null;
  aptitud: string | null;
  fechaEmo: string | null;
  fechaVencimiento: string | null;
  diasParaVencer: number | null;
  restriccionesVigentes: string[];
  ultimoDescansoEstado: string | null;
  ultimoDescansoFechaFin: string | null;
}

export interface MiDescansoDto {
  id: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number | null;
  motivo: string | null;
  diagnostico: string | null;
  diagnosticoCie10: string | null;
  estado: string | null;
  motivoRechazo: string | null;
  urlCertificado: string | null;
  urlDocumento: string | null;
  createdAt: string;
}

export interface CrearMiDescansoDto {
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias?: number | null;
  motivo?: string | null;
  diagnostico?: string | null;
  diagnosticoCie10?: string | null;
}
