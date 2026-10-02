import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CronogramaConfiguracion,
  CronogramaCorreo,
  CronogramaDestinatarioInput,
} from '../dtos/cronograma-configuracion.dto';
import {
  RecordatorioEnvioManual,
  RecordatorioSimulacion,
} from '../../../../../shared/components/envio-manual-recordatorio/envio-manual-recordatorio.dto';

/**
 * Cronograma de Hitos → Configuración. Las escrituras son una por acción de la pantalla (los
 * interruptores guardan al tocarlos): mandar la lista completa pisaría lo que otro acabara de
 * cambiar en otra fila. Las que cambian la lista devuelven el correo actualizado, así la pantalla
 * no vuelve a pedir todo.
 */
@Injectable({ providedIn: 'root' })
export class CronogramaConfiguracionService {
  private readonly base = `${environment.apiUrl}api/v1/milestone-schedule/configuracion`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Secciones, correos, destinatarios y las opciones del modal, en una sola petición. */
  get(): Observable<CronogramaConfiguracion> {
    return this.http.get<CronogramaConfiguracion>(this.base, { headers: this.headers });
  }

  setCorreoActive(codigo: string, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/${encodeURIComponent(codigo)}/active`,
      { active },
      { headers: this.headers },
    );
  }

  /** El destinatario que pone el sistema (el residente): va por el código del correo. */
  setPrincipalActive(codigo: string, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/${encodeURIComponent(codigo)}/principal/active`,
      { active },
      { headers: this.headers },
    );
  }

  crearDestinatario(codigo: string, dto: CronogramaDestinatarioInput): Observable<CronogramaCorreo> {
    return this.http.post<CronogramaCorreo>(
      `${this.base}/correos/${encodeURIComponent(codigo)}/destinatarios`,
      dto,
      { headers: this.headers },
    );
  }

  actualizarDestinatario(id: number, dto: CronogramaDestinatarioInput): Observable<CronogramaCorreo> {
    return this.http.put<CronogramaCorreo>(`${this.base}/destinatarios/${id}`, dto, {
      headers: this.headers,
    });
  }

  setDestinatarioActive(id: number, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/destinatarios/${id}/active`,
      { active },
      { headers: this.headers },
    );
  }

  eliminarDestinatario(id: number): Observable<CronogramaCorreo> {
    return this.http.delete<CronogramaCorreo>(`${this.base}/destinatarios/${id}`, {
      headers: this.headers,
    });
  }

  /** Envío manual de un recordatorio, paso 1: a quién le saldría el día `fecha` (yyyy-MM-dd). */
  simularRecordatorio(codigo: string, fecha: string): Observable<RecordatorioSimulacion> {
    return this.http.get<RecordatorioSimulacion>(
      `${this.base}/correos/${encodeURIComponent(codigo)}/simulacion`,
      { headers: this.headers, params: { fecha } },
    );
  }

  /** Paso 2: lo envía. Si ese día no sale nada, no envía nada. */
  enviarRecordatorio(codigo: string, fecha: string): Observable<RecordatorioEnvioManual> {
    return this.http.post<RecordatorioEnvioManual>(
      `${this.base}/correos/${encodeURIComponent(codigo)}/envio-manual`,
      null,
      { headers: this.headers, params: { fecha } },
    );
  }
}
