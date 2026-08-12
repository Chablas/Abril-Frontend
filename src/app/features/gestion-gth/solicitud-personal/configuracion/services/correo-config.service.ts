import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CorreoAdicionalCreate,
  CorreoAdicionalUpdate,
  CorreoConfig,
} from '../dtos/correo-config.dto';

/**
 * Configuración de los correos del flujo de Solicitud de Personal: qué correos se envían,
 * a quién y con qué destinatarios activos. Reemplaza al modal de dos cajas de texto: los
 * correos de los gerentes ya no se escriben, salen del dato maestro del trabajador.
 */
@Injectable({ providedIn: 'root' })
export class CorreoConfigService {
  private readonly base = `${environment.apiUrl}api/v1/gestion-gth/solicitud-personal/configuracion`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Todos los correos con sus destinatarios, en una sola petición. */
  getCorreos(): Observable<CorreoConfig> {
    return this.http.get<CorreoConfig>(`${this.base}/correos`, { headers: this.headers });
  }

  /** Prende o apaga un correo completo (interruptor maestro de la sección). */
  setCorreoActive(codigo: string, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/${codigo}/active`,
      { active },
      { headers: this.headers },
    );
  }

  /** Prende o apaga un destinatario dentro de su correo. */
  setDestinatarioActive(id: number, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/destinatarios/${id}/active`,
      { active },
      { headers: this.headers },
    );
  }

  crearAdicional(dto: CorreoAdicionalCreate): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.base}/correos/destinatarios`,
      dto,
      { headers: this.headers },
    );
  }

  actualizarAdicional(id: number, dto: CorreoAdicionalUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/destinatarios/${id}`,
      dto,
      { headers: this.headers },
    );
  }

  eliminarAdicional(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/correos/destinatarios/${id}`,
      { headers: this.headers },
    );
  }
}
