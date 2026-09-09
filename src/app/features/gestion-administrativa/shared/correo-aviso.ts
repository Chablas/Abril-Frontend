/**
 * Un correo que una acción va a disparar, con sus destinatarios REALES ya resueltos por el
 * backend con Configuración → Correos.
 *
 * Es una lista y no un objeto suelto porque una acción puede disparar más de un correo a públicos
 * distintos: aprobar el reembolso avisa al solicitante Y a Tesorería. Lista vacía = esa acción hoy
 * no manda ningún correo.
 */
export interface CorreoAvisoDto {
  /** Qué correo es ("Al solicitante", "A Tesorería"). Va delante de las direcciones. */
  etiqueta: string;
  para: string[];
  copia: string[];
}

/**
 * Selección sobre la que se pregunta qué correos saldrían. Repite la forma de los DTO de las
 * acciones (planillas y/o salidas sueltas) para poder pedir el preview con la MISMA selección con
 * la que después se va a escribir. Cada pantalla manda solo los campos que usa.
 */
export interface CorreoPreviewRequestDto {
  rendicionIds?: number[];
  solicitudIds?: number[];
  /** De qué paso del flujo se pide el preview. Las pantallas con una sola decisión lo omiten. */
  accion?: 'PRIMERA_REVISION' | 'REEMBOLSO';
  /** true = la variante que aprueba; false = la que observa o rechaza. */
  aprobar: boolean;
}

/**
 * Adapta unos destinatarios sueltos al formato de la lista de avisos.
 *
 * Lo usa Mis Rendiciones, que resuelve sus dos correos una sola vez al cargar la pantalla —está
 * acotada a un trabajador y sus destinatarios no dependen de la selección— y por eso no pasa por
 * el endpoint de preview.
 */
export const avisosDe = (
  etiqueta: string,
  destinatarios: { para: string[]; copia: string[] } | null,
): CorreoAvisoDto[] =>
  destinatarios?.para?.length
    ? [{ etiqueta, para: destinatarios.para, copia: destinatarios.copia ?? [] }]
    : [];

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CAJA_AVISO =
  'text-align:left;background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;color:#92400E';

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

  const bloques = conDestinatarios.map((a, i) => {
    const para = a.para.map(escapar).join(', ');
    const copia = (a.copia ?? []).map(escapar).join(', ');

    return `<div${i > 0 ? ' style="margin-top:8px"' : ''}>
      ${escapar(a.etiqueta)}: <b style="color:var(--color-abril-logo-blue);word-break:break-all">${para}</b>
      ${copia
        ? `<div style="margin-top:2px;color:#6B7280">En copia: <span style="word-break:break-all">${copia}</span></div>`
        : ''}
    </div>`;
  });

  return `<div style="text-align:left;color:#4B5563">${bloques.join('')}</div>`;
}
