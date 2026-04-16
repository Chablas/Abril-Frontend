import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ArqComercialDashboardDTO,
  ArqComercialFiltersDTO,
  ArqComercialSelectedFilters,
} from '../dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';

@Injectable({ providedIn: 'root' })
export class ArquitecturaComercialService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial`;

  constructor(private http: HttpClient) {}

  getDashboardData(filters: ArqComercialSelectedFilters): Observable<ArqComercialDashboardDTO> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value !== null && value !== '' && value !== undefined && value !== 0) {
        params = params.set(key, value);
      }
    });

    return this.http.get<ArqComercialDashboardDTO>(`${this.apiUrl}/dashboard`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getFilters(): Observable<ArqComercialFiltersDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ArqComercialFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
