import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  CorreoConfigInicial,
  CorreoDestinatarioInput,
  CorreoGrupo,
  CorreoPantalla,
} from '../dtos/ga-correo.dto';

/**
 * Configuración de los correos del flujo de salidas. Todas las operaciones reciben la `pantalla`
 * porque hay una configuración por pantalla del flujo —Solicitud de Salidas, Mis Rendiciones,
 * Gestión de Salidas, Gestión de Rendiciones y Reembolsos— y el backend acota cada una a los
 * correos que se originan ahí (mismo esquema que la configuración de correos de Gestión GTH).
 *
 * Las escrituras son granulares (una por acción de la pantalla) y no un reemplazo de la lista
 * completa: los interruptores guardan al momento de tocarlos, así que mandar la lista entera
 * pisaría lo que otro editor acabara de cambiar en otra fila.
 */
@Injectable({ providedIn: 'root' })
export class CorreosService {
  constructor(private http: HttpClient) {}

  private base(pantalla: CorreoPantalla): string {
    return `${environment.apiUrl}api/v1/gestion-administrativa/${pantalla}/configuracion/correos`;
  }

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Carga inicial de una sección: sus correos con destinatarios + opciones de los desplegables
   * (1 petición). El `grupo` separa los correos del flujo de los recordatorios del plazo; se
   * omite en la petición cuando es `correos` para no ensuciar la URL del caso normal.
   */
  getInicial(pantalla: CorreoPantalla, grupo: CorreoGrupo = 'correos'): Observable<CorreoConfigInicial> {
    const url = grupo === 'correos' ? this.base(pantalla) : `${this.base(pantalla)}?grupo=${grupo}`;
    return this.http.get<CorreoConfigInicial>(url, { headers: this.headers });
  }

  /** Prende o apaga un correo completo (interruptor maestro de la sección). */
  setEventoActive(
    pantalla: CorreoPantalla,
    codigo: string,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(pantalla)}/${encodeURIComponent(codigo)}/active`,
      { active },
      { headers: this.headers },
    );
  }

  /**
   * Prende o apaga el destinatario principal (el revisor de la solicitud, el solicitante). Va por
   * el código del correo y no por un id: ese destinatario no es una fila de la tabla de reglas,
   * es una propiedad del propio correo.
   */
  setPrincipalActive(
    pantalla: CorreoPantalla,
    codigo: string,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(pantalla)}/${encodeURIComponent(codigo)}/principal/active`,
      { active },
      { headers: this.headers },
    );
  }

  crearDestinatario(
    pantalla: CorreoPantalla,
    codigo: string,
    dto: CorreoDestinatarioInput,
  ): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.base(pantalla)}/${encodeURIComponent(codigo)}/destinatarios`,
      dto,
      { headers: this.headers },
    );
  }

  actualizarDestinatario(
    pantalla: CorreoPantalla,
    id: number,
    dto: CorreoDestinatarioInput,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(pantalla)}/destinatarios/${id}`,
      dto,
      { headers: this.headers },
    );
  }

  setDestinatarioActive(
    pantalla: CorreoPantalla,
    id: number,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(pantalla)}/destinatarios/${id}/active`,
      { active },
      { headers: this.headers },
    );
  }

  eliminarDestinatario(pantalla: CorreoPantalla, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base(pantalla)}/destinatarios/${id}`,
      { headers: this.headers },
    );
  }
}
