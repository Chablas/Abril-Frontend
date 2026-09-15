import { Observable, firstValueFrom } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { CorreoAvisoDto, avisosCorreoHtml } from './correo-aviso';

/**
 * Pide el preview de correos de una acción. Best-effort a propósito: si la petición falla, la
 * confirmación sale sin la lista de direcciones en vez de bloquear la decisión. Que no se pueda
 * anticipar el correo no es razón para no dejar aprobar.
 */
export const pedirAvisos = (obs: Observable<CorreoAvisoDto[]>): Promise<CorreoAvisoDto[]> =>
  firstValueFrom(obs).catch(() => [] as CorreoAvisoDto[]);

export interface ConfirmacionConCorreosOpts {
  titulo: string;
  /** Los que devolvió el preview. Vacío = la acción no manda ningún correo. */
  avisos: CorreoAvisoDto[];
  confirmButtonText: string;
  confirmButtonColor?: string;
  icon?: 'question' | 'warning';
  /**
   * Una línea de contexto, solo cuando la acción tiene un efecto que el título no dice y la
   * pantalla no muestra (que se estampa la firma, que el conjunto es más chico que la selección).
   * En la mayoría de los casos va sin nada: los correos son la información, el resto es relleno.
   */
  nota?: string;
  /** Qué decir cuando no sale ningún correo. Ver `avisosCorreoHtml`. */
  sinNadie?: string;
  /** Pide un comentario obligatorio (observar / rechazar). */
  observacion?: { label: string; placeholder: string; obligatoria?: boolean };
}

/**
 * Confirmación de una acción que dispara correos, con las direcciones reales impresas.
 *
 * Es una sola función y no un `Swal.fire` por pantalla para que las once confirmaciones del flujo
 * salgan iguales: mismo orden (nota → correos), mismo tamaño de texto —el de SweetAlert2, sin
 * `font-size` propio— y el mismo trato cuando no hay a quién avisarle.
 */
export function confirmarConCorreos(o: ConfirmacionConCorreosOpts): Promise<SweetAlertResult> {
  const nota = o.nota
    ? `<div style="text-align:left;margin-bottom:8px;color:#4B5563">${o.nota}</div>`
    : '';

  return Swal.fire({
    icon: o.icon ?? 'question',
    title: o.titulo,
    html: nota + avisosCorreoHtml(o.avisos, o.sinNadie),
    ...(o.observacion
      ? {
          input: 'textarea' as const,
          inputLabel: o.observacion.label,
          inputPlaceholder: o.observacion.placeholder,
          ...(o.observacion.obligatoria === false
            ? {}
            : {
                inputValidator: (v: string) =>
                  v && v.trim() ? null : `${o.observacion!.label} es obligatoria`,
              }),
        }
      : {}),
    showCancelButton: true,
    confirmButtonText: o.confirmButtonText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: o.confirmButtonColor ?? '#0F6E56',
  });
}
