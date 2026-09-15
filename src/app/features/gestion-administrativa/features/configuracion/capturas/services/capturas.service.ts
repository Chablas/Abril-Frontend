import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  GaCapturaAreaInicialDto,
  GaCapturaAreaUpdateDto,
} from '../dtos/ga-captura-area.dto';

@Injectable({ providedIn: 'root' })
export class GaCapturasAreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/capturas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Tabla + opciones de los filtros en una sola petición. */
  getInitialData(): Observable<GaCapturaAreaInicialDto> {
    return this.http.get<GaCapturaAreaInicialDto>(this.apiUrl, { headers: this.headers });
  }

  setCapturasObligatorias(
    areaScopeId: number,
    dto: GaCapturaAreaUpdateDto,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }
}
