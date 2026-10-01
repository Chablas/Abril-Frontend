import { Pipe, PipeTransform } from '@angular/core';

/** Un tramo del asunto de un correo: texto fijo, o lo que cambia en cada envío. */
export interface AsuntoParte {
  texto: string;
  variable: boolean;
}

/**
 * Parte el asunto de un correo, tal como lo manda el backend en las configuraciones de correos
 * («Solicitud de salida {código} - {solicitante}»), en tramos fijos y variables, para dibujar lo
 * que cambia en cada envío distinto del texto que se busca en Enviados.
 *
 * Pura: se recalcula solo si cambia el asunto, no en cada ciclo de detección de cambios.
 */
@Pipe({ name: 'asuntoPartes', standalone: true })
export class AsuntoPartesPipe implements PipeTransform {
  transform(asunto: string | null | undefined): AsuntoParte[] {
    if (!asunto) return [];
    return asunto
      .split(/(\{[^}]+\})/)
      .filter((t) => t.length > 0)
      .map((t) =>
        /^\{[^}]+\}$/.test(t)
          ? { texto: t.slice(1, -1), variable: true }
          : { texto: t, variable: false },
      );
  }
}
