/**
 * Un correo que una acción va a disparar, con sus destinatarios REALES ya resueltos por el
 * backend con Configuración → Correos.
 *
 * Es una lista y no un objeto suelto porque una acción puede disparar más de un correo a públicos
 * distintos: aprobar el reembolso avisa al solicitante Y a Tesorería. Lista vacía = esa acción hoy
 * no manda ningún correo.
 *
 * Casi siempre llega del endpoint de preview de la pantalla, pedido al confirmar. Solicitud de
 * Salidas («Rendir») y Mis Rendiciones («Enviar a revisión») la traen con sus datos de arranque:
 * están acotadas a un solo trabajador y sus destinatarios no dependen de la selección.
 */
export interface CorreoAvisoDto {
  para: string[];
  copia: string[];
}

/**
 * Selección de planillas sobre la que se pregunta qué correos saldrían. Repite la forma del DTO de
 * la acción para poder pedir el preview con la MISMA selección con la que después se va a escribir.
 *
 * Lo usa Gestión de Rendiciones, cuya única decisión es la primera revisión. Las otras pantallas
 * del flujo mandan su propia forma: Consolidados por consolidado, Gestión de Salidas y Correcciones
 * S10 por lista de ids.
 */
export interface CorreoPreviewRequestDto {
  rendicionIds: number[];
  /** true = la variante que aprueba; false = la que observa. */
  aprobar: boolean;
  /**
   * De qué paso se pregunta, cuando la pantalla dispara más de una familia de correos. Sin valor
   * es la primera revisión, que es su decisión de siempre; `PLANILLA_GRUPAL` es el aviso que sale
   * al preparar la planilla grupal (a los trabajadores de sus rendiciones), y `CONSOLIDADO_S10` los
   * que salen al adjuntar el consolidado (a la jefatura y a esos mismos trabajadores).
   */
  accion?: 'PLANILLA_GRUPAL' | 'CONSOLIDADO_S10';
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CAJA_AVISO =
  'text-align:left;background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;color:#92400E';

/** Quita repetidos sin mirar mayúsculas: la misma dirección puede venir en dos avisos de la acción. */
const unicos = (correos: string[]): string[] => {
  const vistos = new Set<string>();
  return correos.filter((c) => {
    const clave = (c ?? '').trim().toLowerCase();
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
};

/**
 * Cuerpo del SweetAlert de una acción que dispara correos: las direcciones a las que de verdad va
 * a salir, y nada más.
 *
 * Se imprimen los correos y no "tu jefe" porque quién los recibe lo decide Configuración →
 * Correos: ahí el destinatario principal se puede apagar y el aviso irse solo a los agregados a
 * mano, o a nadie. El backend los resuelve con el MISMO cálculo que hace el envío, así que la
 * confirmación no puede prometer algo distinto de lo que va a pasar — por eso llegan resueltos y
 * no se recalcula nada acá.
 *
 * Una acción puede disparar más de un correo (aprobar el reembolso avisa al solicitante Y a
 * Tesorería), pero la confirmación no los separa por público: lo único que se pregunta antes de
 * apretar el botón es a quién le va a llegar. Por eso sale un solo "Se notificará a:" con todas
 * las direcciones juntas y sin repetir a nadie.
 *
 * Sin `font-size` a propósito: hereda el del cuerpo de SweetAlert2 para salir del mismo tamaño que
 * los avisos que usan `text:`. Fijarlo en px lo deja más chico que el resto del módulo.
 *
 * @param avisos   los que devuelve el endpoint de preview de la pantalla.
 * @param sinNadie qué decir cuando no sale ningún correo. El default sirve para las acciones cuyo
 *                 único efecto externo ES el correo; quien procede igual sin él (enviar a primera
 *                 revisión mueve la planilla aunque el aviso esté apagado) pasa su propio texto.
 */
export function avisosCorreoHtml(
  avisos: CorreoAvisoDto[],
  sinNadie = 'No sale ningún correo: está apagado en Configuración → Correos.',
): string {
  const conDestinatarios = (avisos ?? []).filter((a) => a.para?.length);

  if (conDestinatarios.length === 0) {
    return `<div style="${CAJA_AVISO}">${sinNadie}</div>`;
  }

  const para = unicos(conDestinatarios.flatMap((a) => a.para));
  // Quien ya está nombrado como destinatario no se repite en la copia: para el que confirma es la
  // misma persona avisada dos veces.
  const enPara = new Set(para.map((p) => p.trim().toLowerCase()));
  const copia = unicos(conDestinatarios.flatMap((a) => a.copia ?? []))
    .filter((c) => !enPara.has(c.trim().toLowerCase()));

  return `<div style="text-align:left;color:#4B5563">
    Se notificará a: <b style="color:var(--color-abril-logo-blue);word-break:break-all">${para.map(escapar).join(', ')}</b>
    ${copia.length
      ? `<div style="margin-top:2px;color:#6B7280">En copia: <span style="word-break:break-all">${copia.map(escapar).join(', ')}</span></div>`
      : ''}
  </div>`;
}
