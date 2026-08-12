import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AprobacionGgDecision,
  AprobacionGgDecisionResult,
  AprobacionGgPublico,
  AprobacionGgReenvioResult,
} from '../dtos/aprobacion-gerencia.dto';

/**
 * Aprobación de Gerencia General de una solicitud de personal. Vive en el `shared/` del módulo
 * porque lo usan dos vistas: la página pública donde el GG decide y la de Solicitud de Personal
 * (botón "Reenviar a Gerencia General" del solicitante).
 *
 * Los dos endpoints públicos son anónimos (el GG entra desde el enlace del correo y no inicia
 * sesión), así que NO se les manda el header Authorization. El reenvío sí es del solicitante
 * autenticado y usa el token de sesión como el resto de la app.
 */
@Injectable({ providedIn: 'root' })
export class AprobacionGerenciaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/aprobacion-gerencia`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Solicitud a decidir (público, por token). */
  getPublico(token: string): Observable<AprobacionGgPublico> {
    return this.http.get<AprobacionGgPublico>(`${this.apiUrl}/publico`, {
      params: { token },
    });
  }

  /** Registra la decisión de Gerencia General (público, por token). */
  decidir(token: string, dto: AprobacionGgDecision): Observable<AprobacionGgDecisionResult> {
    return this.http.post<AprobacionGgDecisionResult>(`${this.apiUrl}/publico/decision`, dto, {
      params: { token },
    });
  }

  /** Reenvía el correo al Gerente General (solicitante autenticado, mismo enlace). */
  reenviar(requerimientoId: number): Observable<AprobacionGgReenvioResult> {
    return this.http.post<AprobacionGgReenvioResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/reenviar`,
      {},
      { headers: this.headers },
    );
  }
}
