import { CorreoAvisoDto } from '../../../shared/correo-aviso';

export interface LugarProyectoOptionDto {
  id: number;
  nombreDisplay: string;
}

/** Un mes del desplegable "Mes a rendir". */
export interface MesRendicionDto {
  anio: number;
  mes: number;
  /** "Agosto 2026" — ya viene capitalizado del backend. */
  label: string;
  /** Cuántas solicitudes propias aptas para rendir tiene ese mes. */
  cantidad: number;
  /**
   * Último día para rendir ese mes (YYYY-MM-DD): el N.º día hábil del mes siguiente, con N
   * configurable en Solicitud de Salidas → Configuración → Días reembolsables. Solo se
   * ofrecen meses cuyo plazo sigue abierto, así que siempre es de hoy en adelante.
   */
  fechaLimite: string;
}

export interface SolicitudSalidaFilterDataDto {
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Meses que ofrece el desplegable "Mes a rendir" (los que tienen algo apto). */
  mesesRendicion: MesRendicionDto[];
  /**
   * A quién le llegan los correos de «Rendir», que envía la planilla a primera revisión: el aviso a
   * la jefatura y el acuse al trabajador, ya resueltos por el backend con Configuración → Correos.
   * Vacío = no sale ninguno.
   */
  correosRendir: CorreoAvisoDto[];
}
