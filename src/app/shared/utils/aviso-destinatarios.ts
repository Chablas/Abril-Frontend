const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const linea = (etiqueta: string, correos: string[]) =>
  `<div style="margin-top:2px;color:#6B7280">${etiqueta}: <span style="word-break:break-all">${correos.map(escapar).join(', ')}</span></div>`;

/**
 * «Se notificará a: …» con las direcciones a las que de verdad sale un correo: el cuerpo de los
 * SweetAlert que confirman un envío. Lo usan las acciones de Gestión Administrativa (a través de
 * `avisosCorreoHtml`, que junta los avisos de la acción) y el envío manual de los recordatorios
 * (Cronograma de Hitos y Solicitud de Salidas), para que todos se vean igual.
 *
 * Recibe las listas ya resueltas y sin repetidos: no recalcula nada. Sin `font-size` a propósito:
 * hereda el del cuerpo de SweetAlert2, como los avisos que usan `text:`.
 */
export function avisoDestinatariosHtml(
  para: string[],
  copia: string[] = [],
  copiaOculta: string[] = [],
): string {
  return `<div style="text-align:left;color:#4B5563">
    Se notificará a: <b style="color:var(--color-abril-logo-blue);word-break:break-all">${para.map(escapar).join(', ')}</b>
    ${copia.length ? linea('En copia', copia) : ''}
    ${copiaOculta.length ? linea('En copia oculta', copiaOculta) : ''}
  </div>`;
}
