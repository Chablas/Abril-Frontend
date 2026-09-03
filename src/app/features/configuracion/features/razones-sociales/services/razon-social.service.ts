import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  RazonSocial,
  RazonSocialBandeja,
  RazonSocialCreate,
  RazonSocialUpdate,
  SunatContributor,
} from '../dtos/razon-social.dto';

@Injectable({ providedIn: 'root' })
export class RazonSocialService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/configuracion/razones-sociales`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: tabla + catálogo de bancos, en una sola petición. */
  getBandeja(): Observable<RazonSocialBandeja> {
    return this.http.get<RazonSocialBandeja>(this.apiUrl, { headers: this.headers });
  }

  /** Consulta de RUC a SUNAT para el alta. */
  consultarRuc(ruc: string): Observable<SunatContributor> {
    return this.http.get<SunatContributor>(`${this.apiUrl}/ruc/${ruc}`, { headers: this.headers });
  }

  create(dto: RazonSocialCreate): Observable<RazonSocial> {
    return this.http.post<RazonSocial>(this.apiUrl, dto, { headers: this.headers });
  }

  update(id: number, dto: RazonSocialUpdate): Observable<RazonSocial> {
    return this.http.put<RazonSocial>(`${this.apiUrl}/${id}`, dto, { headers: this.headers });
  }
}
