/**
 * Configuración de los correos de Gestión GTH: una sección por correo del flujo, cada una con su
 * interruptor maestro y sus destinatarios.
 *
 * Hay dos clases de destinatario:
 *  • Dinámicos (`codigo` no nulo): el correo no está guardado, se resuelve al enviar
 *    (Gerente General, gerente del área del solicitante, área de GTH, área de TI). Solo se
 *    prenden y apagan.
 *  • Correos adicionales (`codigo` nulo): se escriben a mano y se pueden editar y eliminar.
 */

/**
 * Qué pantalla de configuración se está usando. Es el segmento del backend
 * (`api/v1/gestion-gth/{modulo}/configuracion`) y define qué correos administra cada una:
 *  • `solicitud-personal` → el flujo del solicitante (aprobación de GG, decisiones de candidatos).
 *  • `aprobaciones`       → los avisos a GTH y a TI que dispara la decisión de Gerencia.
 *  • `reclutamiento`      → los del proceso que maneja GTH (long list, formulario al postulante,
 *                           formulario completado, correcciones, entrevista y agradecimiento).
 */
export type CorreoConfigModulo = 'solicitud-personal' | 'aprobaciones' | 'reclutamiento';

/** Una fila de la sección de un correo. */
export interface CorreoDestinatarioFila {
  destinatarioId: number;
  /** Código del destinatario dinámico; null en los correos adicionales. */
  codigo: string | null;
  nombre: string | null;
  descripcion: string | null;
  /** Correo guardado; null en los dinámicos. */
  email: string | null;
  /** true = va en copia (CC); false = destinatario principal (Para). */
  esCopia: boolean;
  active: boolean;
  editable: boolean;
  eliminable: boolean;
  /** Correo al que resuelve hoy un dinámico, para mostrar a quién le llega de verdad. */
  emailResuelto: string | null;
  nombreResuelto: string | null;
  /** true = está activo pero hoy no resuelve a ningún correo, así que no le llega a nadie. */
  sinCorreo: boolean;
  /** true = se resuelve recién al enviar porque depende de quién registre la solicitud. */
  dependeDeLaSolicitud: boolean;
  orden: number;
}

/** Una sección de la pantalla. */
export interface CorreoConfigEvento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** Interruptor maestro: false = el correo no se envía. */
  active: boolean;
  /**
   * true = el destinatario principal lo pone el backend solo (la long list va siempre al
   * solicitante), así que acá solo se agregan principales extra y copias.
   */
  principalAutomatico: boolean;
  orden: number;
  destinatarios: CorreoDestinatarioFila[];
}

export interface CorreoConfig {
  eventos: CorreoConfigEvento[];
}

export interface CorreoAdicionalCreate {
  eventoCodigo: string;
  email: string;
  nombre: string | null;
  esCopia: boolean;
}

export interface CorreoAdicionalUpdate {
  email: string;
  nombre: string | null;
  esCopia: boolean;
}
