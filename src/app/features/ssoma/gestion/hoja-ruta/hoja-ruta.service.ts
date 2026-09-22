import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ContratistaActivoDto, HojaRutaResumenDto } from './hoja-ruta.dtos';

@Injectable({ providedIn: 'root' })
export class HojaRutaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/hoja-ruta`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getResumen(
    contributorId: number,
    proyectoId: number,
    anio: number,
    numeroSemana: number,
  ): Observable<HojaRutaResumenDto> {
    const params =
      `?contributorId=${contributorId}&proyectoId=${proyectoId}` +
      `&anio=${anio}&numeroSemana=${numeroSemana}`;
    return this.http.get<HojaRutaResumenDto>(`${this.base}${params}`, {
      headers: this.authHeaders(),
    });
  }

  getContratistasActivos(proyectoId: number): Observable<ContratistaActivoDto[]> {
    return this.http.get<ContratistaActivoDto[]>(`${this.base}/contratistas?proyectoId=${proyectoId}`, {
      headers: this.authHeaders(),
    });
  }
}
