import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { FuncionalidadDetalleDto, FuncionalidadListItemDto } from '../dtos/funcionalidad.dto';

@Injectable({ providedIn: 'root' })
export class FuncionalidadesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/funcionalidades`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Catálogo completo con sus conteos: la pantalla filtra y pagina en memoria. */
  list(): Observable<FuncionalidadListItemDto[]> {
    return this.http.get<FuncionalidadListItemDto[]>(this.apiUrl, { headers: this.headers });
  }

  /** Roles que tienen la funcionalidad y usuarios que acceden por ellos, en una sola petición. */
  getDetalle(featureId: number): Observable<FuncionalidadDetalleDto> {
    return this.http.get<FuncionalidadDetalleDto>(`${this.apiUrl}/${featureId}`, { headers: this.headers });
  }
}
