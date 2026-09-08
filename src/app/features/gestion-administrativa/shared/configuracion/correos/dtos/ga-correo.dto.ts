/**
 * Configuración de los correos del flujo de salidas: una sección por correo, cada una con su
 * interruptor maestro y su lista de destinatarios, todos activables uno por uno.
 *
 * Los correos NO viven todos juntos: cada uno cuelga de la pantalla donde SE ORIGINA
 * (`CorreoPantalla`), y esa pantalla los administra desde su propio botón «Configuración». Antes
 * estaban los once en Configuración → Correos, que se dio de baja por lo mismo: no se sabía qué
 * correo salía de dónde.
 *
 * Hay dos clases de destinatario:
 *  • El **principal**, que resuelve el backend al enviar (el revisor de la solicitud, el
 *    solicitante). No es una fila de `ga_correo_regla` sino una propiedad del propio correo, así
 *    que su interruptor va por `setPrincipalActive` y la pantalla lo dibuja con `id` 0.
 *  • Los **configurados** (`ga_correo_regla`): un trabajador, un área (se expande a sus miembros)
 *    o un correo escrito a mano. Se agregan, editan, prenden/apagan y eliminan desde la pantalla.
 */

/**
 * Pantalla del flujo cuya configuración se está viendo. Es el segmento del backend
 * (`api/v1/gestion-administrativa/{pantalla}/configuracion/correos`) y también el de la URL del
 * frontend, y define qué correos administra cada una — el criterio es dónde se ORIGINA el correo,
 * no a quién le llega:
 *  • `solicitud-salidas`   → los dos que salen al crear la solicitud.
 *  • `rendiciones`         → los que dispara el trabajador (enviar la planilla a 1.ª revisión y
 *                            avisar que adjuntó el Consolidado del S10).
 *  • `gestion-salidas`     → la decisión del revisor sobre la solicitud (aprobada / rechazada).
 *  • `gestion-rendiciones` → las dos decisiones del revisor sobre la planilla (1.ª revisión y
 *                            reembolso).
 *  • `reembolsos`          → Tesorería: hoy ninguno (marcar pagado no envía correos).
 */
export type CorreoPantalla =
  | 'solicitud-salidas'
  | 'rendiciones'
  | 'gestion-salidas'
  | 'gestion-rendiciones'
  | 'reembolsos';

/** Códigos estables del catálogo de tipos de destinatario. */
export type CorreoTipoCodigo = 'TRABAJADOR' | 'AREA' | 'CORREO';

/** Un destinatario configurado, ya resuelto por el backend para mostrarlo. */
export interface CorreoDestinatario {
  /** id de ga_correo_regla. La fila sintética del principal usa 0. */
  id: number;
  tipoCodigo: CorreoTipoCodigo;
  /** Nombre para mostrar: el del trabajador, el del área, o el propio correo. */
  nombre: string;
  /** Dirección literal (CORREO) o el corporativo del trabajador. Null en AREA. */
  email: string | null;
  /** Solo en AREA: a cuántos correos se expande hoy. */
  miembros: number | null;
  workerId: number | null;
  areaScopeId: number | null;
  incluirDescendientes: boolean;
  active: boolean;
  /** true = está activo pero hoy no resuelve a ningún correo. */
  sinCorreo: boolean;
}

/** Un correo configurable (ga_correo_evento) con su lista de destinatarios. */
export interface CorreoEvento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
  /** Interruptor maestro: false = este correo no se envía a nadie. */
  active: boolean;
  /** Etiqueta del destinatario principal que calcula el backend (el revisor, el solicitante). */
  destinatarioPrincipalNombre?: string | null;
  /** false = el correo no se manda a su destinatario principal, solo a los configurados. */
  destinatarioPrincipalActivo: boolean;
  /** true = la pantalla muestra el interruptor maestro de este correo. */
  permiteDesactivarEnvio: boolean;
  /** true = la pantalla muestra el interruptor del destinatario principal. */
  permiteDesactivarPrincipal: boolean;
  destinatarios: CorreoDestinatario[];
}

export interface CorreoWorkerOption {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface CorreoAreaOption {
  areaScopeId: number;
  nombre: string;
  parentId?: number | null;
  /** Correo de grupo del área (area_scope.email), informativo. */
  email?: string | null;
  /** Etiqueta para el desplegable; desambigua áreas con el mismo nombre (se calcula en el front). */
  label?: string;
}

/** Carga inicial de la sección (1 sola petición). */
export interface CorreoConfigInicial {
  eventos: CorreoEvento[];
  trabajadores: CorreoWorkerOption[];
  areas: CorreoAreaOption[];
}

/** Alta o edición de un destinatario configurado. */
export interface CorreoDestinatarioInput {
  tipoCodigo: CorreoTipoCodigo;
  workerId?: number | null;
  areaScopeId?: number | null;
  correo?: string | null;
  /** Solo aplica a AREA. */
  incluirDescendientes: boolean;
}
