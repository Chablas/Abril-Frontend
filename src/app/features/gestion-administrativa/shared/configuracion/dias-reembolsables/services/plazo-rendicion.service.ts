import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  PlazoRendicion,
  PlazoRendicionSave,
  PlazoRendicionSaveResult,
} from '../dtos/plazo-rendicion.dto';

/**
 * Plazo de rendición (sección "Días reembolsables"). Cuelga de la configuración de Solicitud de
 * Salidas, igual que los correos y los recordatorios de esa misma pantalla: el trabajador rinde
 * desde ahí, así que es ahí donde se administra hasta cuándo puede hacerlo.
 */
@Injectable({ providedIn: 'root' })
export class PlazoRendicionService {
  private readonly apiUrl =
    `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas/configuracion/plazo`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  get(): Observable<PlazoRendicion> {
    return this.http.get<PlazoRendicion>(this.apiUrl, { headers: this.headers });
  }

  /** Guarda el plazo y los dos alcances. La respuesta trae todo recalculado (nueva fecha límite). */
  guardar(body: PlazoRendicionSave): Observable<PlazoRendicionSaveResult> {
    return this.http.put<PlazoRendicionSaveResult>(this.apiUrl, body, { headers: this.headers });
  }
}
