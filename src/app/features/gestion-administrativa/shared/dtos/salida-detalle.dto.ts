import { ConsolidadoS10Dto } from '../components/consolidado-s10-modal/consolidado-s10.dto';

export interface SolicitudSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface TrayectoAdjuntoDto {
  url: string;
  filename: string;
}

export interface TrayectoDetalleDto {
  id: number;
  orden: number;
  /** Null en trayectos de motivos que no piden horario. */
  horaSalida: string | null;
  horaRetorno: string | null;
  motivo: string;
  /** Detalle que acompaña al motivo cuando este lo exige. Null si no aplica. */
  motivoAdicional: string | null;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  /** Documentos adjuntos del trayecto (motivos que requieren documento). Vacío si no tiene. */
  adjuntos: TrayectoAdjuntoDto[];
  capturas: SolicitudSalidaCapturaDto[];
  /** Monto del catálogo ga_trayecto (solo trabajador TI con match origen+destino). */
  montoCatalogo: number | null;
  /** Monto efectivo: suma de capturas si hay; sino montoCatalogo; sino 0. */
  montoTotal: number;
  /**
   * Si el trayecto genera reembolso de movilidad: lo concede el motivo del catálogo
   * (Configuración → Motivos) y el par (origen, destino) puede anularlo, nunca al revés.
   * Null con motivo libre: no está en el catálogo, no tiene el flag y no se pinta el pill.
   */
  esReembolsable: boolean | null;
}

export interface SolicitudSalidaRendicionDto {
  id: number;
  pdfUrl: string;
  pdfFilename: string;
  rendidoAt: string;
}

export interface SolicitudSalidaDetalleDto {
  id: number;
  /** Código SOL-AAAA-NNNN. Null solo en solicitudes anteriores a la columna. */
  codigo: string | null;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;
  /** PDF de la planilla de rendición. Null si la solicitud aún no fue rendida. */
  rendicion: SolicitudSalidaRendicionDto | null;
  /** Consolidado del S10 vigente (propio de la salida o heredado de su planilla). Null si no hay. */
  consolidadoS10: ConsolidadoS10Dto | null;

  /**
   * Tope de movilidad en soles de CADA trayecto. Varios trayectos pueden sumar más que esto
   * entre todos: lo que un día no aguanta se reparte al imprimir la planilla (el trayecto que
   * desborda sale con la fecha del día siguiente), no se bloquea al cargarlo.
   */
  limiteMovilidadTrayecto: number;

  trayectos: TrayectoDetalleDto[];
}
