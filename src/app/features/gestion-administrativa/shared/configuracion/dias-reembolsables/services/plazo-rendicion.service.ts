import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { PlazoRendicion, PlazoRendicionSaveResult } from '../dtos/plazo-rendicion.dto';

/**
 * Plazo de rendición (sección "Días reembolsables"). Cuelga de la configuración de Mis
 * Rendiciones, igual que los correos de esa misma pantalla.
 */
@Injectable({ providedIn: 'root' })
export class PlazoRendicionService {
  private readonly apiUrl =
    `${environment.apiUrl}api/v1/gestion-administrativa/rendiciones/configuracion/plazo`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  get(): Observable<PlazoRendicion> {
    return this.http.get<PlazoRendicion>(this.apiUrl, { headers: this.headers });
  }

  /** Guarda el número. La respuesta trae el plazo recalculado (nueva fecha límite). */
  guardar(diasHabilesPlazo: number): Observable<PlazoRendicionSaveResult> {
    return this.http.put<PlazoRendicionSaveResult>(
      this.apiUrl,
      { diasHabilesPlazo },
      { headers: this.headers },
    );
  }
}
