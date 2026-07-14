export interface DescansoMotivoDto {
  id: number;
  nombre: string;
}

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
  motivosDescanso: DescansoMotivoDto[];
}

export interface MiDescansoAdjuntoDto {
  url: string;
  nombre: string | null;
}

export interface MiDescansoDto {
  id: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number | null;
  motivo: string | null;
  diagnostico: string | null;
  estado: string | null;
  motivoRechazo: string | null;
  urlCertificado: string | null;
  urlDocumento: string | null;
  adjuntos: MiDescansoAdjuntoDto[];
  createdAt: string;
}

export interface CrearMiDescansoDto {
  fechaInicio: string;
  fechaFin: string;
  dias?: number | null;
  motivoId?: number | null;
  diagnostico?: string | null;
}
