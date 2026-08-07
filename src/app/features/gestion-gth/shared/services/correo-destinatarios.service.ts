import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/** Tipo de correo de reclutamiento configurable (slug de la URL del backend). */
export type CorreoTipo = 'solicitud' | 'long-list' | 'decision-long-list' | 'decision-finalista';

/** Destinatarios de un correo de reclutamiento (principales = Para; copias = CC). */
export interface CorreoDestinatarios {
  principales: string[];
  copias: string[];
}

/**
 * Configuración de destinatarios de los correos de Reclutamiento. Compartido por las
 * features de Solicitud de Personal (tipo `solicitud`) y Reclutamiento/GTH (tipo
 * `long-list`): ambos correos se editan con el mismo modal, cada uno con su propio juego
 * de destinatarios en el backend.
 */
@Injectable({ providedIn: 'root' })
export class CorreoDestinatariosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/reclutamiento/config/correo-destinatarios`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  get(tipo: CorreoTipo): Observable<CorreoDestinatarios> {
    return this.http.get<CorreoDestinatarios>(`${this.apiUrl}/${tipo}`, { headers: this.headers });
  }

  save(tipo: CorreoTipo, dto: CorreoDestinatarios): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${tipo}`, dto, { headers: this.headers });
  }
}
