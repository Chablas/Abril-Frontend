import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { CorreoConfigInicial, CorreoDestinatarioInput } from '../dtos/ga-correo.dto';

/**
 * Configuración de los correos de Solicitud de Salidas. Las escrituras son granulares (una por
 * acción de la pantalla) y no un reemplazo de la lista completa: los interruptores guardan al
 * momento de tocarlos, así que mandar la lista entera pisaría lo que otro editor acabara de
 * cambiar en otra fila.
 */
@Injectable({ providedIn: 'root' })
export class CorreosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/correos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: correos con sus destinatarios + opciones de los desplegables (1 petición). */
  getInicial(): Observable<CorreoConfigInicial> {
    return this.http.get<CorreoConfigInicial>(this.apiUrl, { headers: this.headers });
  }

  /** Prende o apaga un correo completo (interruptor maestro de la sección). */
  setEventoActive(codigo: string, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${encodeURIComponent(codigo)}/active`,
      { active },
      { headers: this.headers },
    );
  }

  /**
   * Prende o apaga el destinatario principal (el revisor de la solicitud, el solicitante). Va por
   * el código del correo y no por un id: ese destinatario no es una fila de la tabla de reglas,
   * es una propiedad del propio correo.
   */
  setPrincipalActive(codigo: string, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${encodeURIComponent(codigo)}/principal/active`,
      { active },
      { headers: this.headers },
    );
  }

  crearDestinatario(
    codigo: string,
    dto: CorreoDestinatarioInput,
  ): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.apiUrl}/${encodeURIComponent(codigo)}/destinatarios`,
      dto,
      { headers: this.headers },
    );
  }

  actualizarDestinatario(
    id: number,
    dto: CorreoDestinatarioInput,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/destinatarios/${id}`,
      dto,
      { headers: this.headers },
    );
  }

  setDestinatarioActive(id: number, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/destinatarios/${id}/active`,
      { active },
      { headers: this.headers },
    );
  }

  eliminarDestinatario(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/destinatarios/${id}`, {
      headers: this.headers,
    });
  }
}
