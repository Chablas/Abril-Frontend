/**
 * Cronograma de Hitos → Configuración: los correos y recordatorios del cronograma, cada uno con su
 * interruptor y su lista de destinatarios, todos activables uno por uno.
 *
 * Dos clases de destinatario:
 *  • El que pone el sistema en cada envío (el residente, en el recordatorio): no es una fila, es
 *    `principalNombre` + `principalActive` del propio correo. Recibe siempre como Para.
 *  • Los de la lista: un trabajador, un rol (le llega a quien lo tenga el día del envío) o un correo
 *    escrito a mano, cada uno con cómo lo recibe (Para, CC o CCO).
 */

/** Toda la pantalla en una llamada: `GET api/v1/milestone-schedule/configuracion`. */
export interface CronogramaConfiguracion {
  /** Correos (los dispara una acción) y Recordatorios (el calendario). */
  grupos: CronogramaCorreoGrupo[];
  trabajadores: CronogramaTrabajadorOpcion[];
  roles: CronogramaRolOpcion[];
  /** Tipos de destinatario: Trabajador, Rol, Correo escrito a mano. */
  tipos: CronogramaOpcion[];
  /** Cómo lo recibe: Para, CC, CCO. */
  recepciones: CronogramaOpcion[];
}

export interface CronogramaCorreoGrupo {
  codigo: string;
  nombre: string;
  correos: CronogramaCorreo[];
}

export interface CronogramaCorreo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** El asunto con que sale, para buscarlo en Enviados. Lo que cambia en cada envío va entre llaves. */
  asunto: string | null;
  /** Interruptor del correo: false = no se envía a nadie. */
  active: boolean;
  /** El destinatario que pone el sistema (el residente). Null = el correo no tiene. */
  principalNombre: string | null;
  principalActive: boolean;
  /** Primero los Para, después los CC y los CCO. */
  destinatarios: CronogramaDestinatario[];
}

export type TipoDestinatario = 'TRABAJADOR' | 'ROL' | 'CORREO';
export type Recepcion = 'PARA' | 'CC' | 'CCO';

export interface CronogramaDestinatario {
  id: number;
  tipoCodigo: TipoDestinatario;
  recepcionCodigo: Recepcion;
  /** El nombre del trabajador, el del rol o la dirección escrita a mano. */
  nombre: string;
  /** Correo corporativo del trabajador o la dirección escrita a mano. Null en un rol. */
  email: string | null;
  /** Solo en un rol: a cuántos correos se expande hoy. */
  miembros: number | null;
  workerId: number | null;
  roleId: number | null;
  active: boolean;
  /** Está en la lista pero hoy no resuelve a ningún correo. */
  sinCorreo: boolean;
}

export interface CronogramaTrabajadorOpcion {
  workerId: number;
  fullName: string;
  email: string;
}

export interface CronogramaRolOpcion {
  roleId: number;
  nombre: string;
  miembros: number;
  /** Nombre + a cuántos alcanza, para el desplegable (se arma en el front). */
  label?: string;
}

export interface CronogramaOpcion {
  codigo: string;
  nombre: string;
}

/** Alta o edición de un destinatario: el tipo decide cuál de los tres campos va lleno. */
export interface CronogramaDestinatarioInput {
  tipoCodigo: TipoDestinatario;
  recepcionCodigo: Recepcion;
  workerId: number | null;
  roleId: number | null;
  correo: string | null;
}
