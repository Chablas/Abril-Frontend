import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  EmoCorreoDestinatarioCreateDto,
  EmoCorreoDestinatarioUpdateDto,
  EmoCorreosConfigDto,
} from '../dtos/emo-configuracion.model';

/**
 * Configuración de EMOs → destinatarios de los correos de programación
 * (programación manual desde /emos y resumen del cron de programación automática).
 */
@Injectable({ providedIn: 'root' })
export class EmoConfiguracionService {
  private readonly base = `${SALUD_OCUPACIONAL_BASE}/emos/configuracion`;

  constructor(private http: HttpClient) {}

  /** Principales y copias en una sola petición. */
  getCorreos(): Observable<EmoCorreosConfigDto> {
    return this.http.get<EmoCorreosConfigDto>(`${this.base}/correos`, {
      headers: buildAuthHeaders(),
    });
  }

  crearCorreo(dto: EmoCorreoDestinatarioCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/correos`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  actualizarCorreo(
    id: number,
    dto: EmoCorreoDestinatarioUpdateDto,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/correos/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  setCorreoActive(id: number, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/${id}/active`,
      { active },
      { headers: buildAuthHeaders() },
    );
  }

  eliminarCorreo(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/correos/${id}`, {
      headers: buildAuthHeaders(),
    });
  }
}
