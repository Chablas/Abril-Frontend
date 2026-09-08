import { CorreoDestinatariosDto } from './dtos/rendicion.dto';

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Cuerpo del modal de confirmación de una acción que dispara un correo: las direcciones a las que
 * de verdad va a salir.
 *
 * Se imprimen los correos y no "tu jefe" porque quién los recibe lo decide Configuración →
 * Correos: ahí el revisor se puede apagar y el aviso irse solo a los destinatarios agregados a
 * mano, o a nadie. El backend resuelve esas listas con el mismo cálculo que hace el envío.
 *
 * Lo usan las dos vistas de Mis Rendiciones (la tabla y el modal de detalle), que disparan los
 * mismos correos desde botones distintos.
 *
 * @param destinatarios ya resueltos por el backend; `para` vacío = no le llega a nadie.
 * @param proposito     qué hace quien lo recibe ("para que la apruebe u observe").
 * @param sinNadie      aviso de estado para cuando no hay a quién mandárselo. Solo hace falta
 *                      pasarlo cuando la acción procede igual sin correo (enviar a revisión mueve
 *                      la planilla aunque el aviso esté apagado); si la acción ES el correo, quien
 *                      llama corta antes y este texto no se usa.
 */
export function avisoCorreoHtml(
  destinatarios: CorreoDestinatariosDto | null,
  proposito: string,
  sinNadie = 'Nadie recibirá este correo: está apagado en Configuración → Correos.',
): string {
  const para = (destinatarios?.para ?? []).map(escapar).join(', ');
  const copia = (destinatarios?.copia ?? []).map(escapar).join(', ');

  if (!para) {
    return `<div style="text-align:left;background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;font-size:13px;color:#92400E">
      ${sinNadie}
    </div>`;
  }

  return `<div style="text-align:left;font-size:13px;color:#4B5563">
    Se notificará a <b style="color:var(--color-abril-logo-blue);word-break:break-all">${para}</b> ${proposito}.
    ${copia
      ? `<div style="margin-top:4px;color:#6B7280">En copia: <span style="word-break:break-all">${copia}</span></div>`
      : ''}
  </div>`;
}
