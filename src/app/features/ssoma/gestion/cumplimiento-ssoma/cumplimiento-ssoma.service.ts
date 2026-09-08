import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CumplimientoActividadDto,
  CumplimientoActividadUpsertDto,
  CumplimientoResumenDto,
  CumplimientoItemDto,
  CumplimientoMarcarDto,
} from './cumplimiento-ssoma.dtos';

@Injectable({ providedIn: 'root' })
export class CumplimientoSsomaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/cumplimiento`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getActividades(): Observable<CumplimientoActividadDto[]> {
    return this.http.get<CumplimientoActividadDto[]>(`${this.base}/actividades`, {
      headers: this.authHeaders(),
    });
  }

  createActividad(dto: CumplimientoActividadUpsertDto): Observable<CumplimientoActividadDto> {
    return this.http.post<CumplimientoActividadDto>(`${this.base}/actividades`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateActividad(actividadId: number, dto: CumplimientoActividadUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/actividades/${actividadId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  getResumen(proyectoId: number, rol?: string): Observable<CumplimientoResumenDto> {
    const params = rol ? `?rol=${encodeURIComponent(rol)}` : '';
    return this.http.get<CumplimientoResumenDto>(`${this.base}/proyecto/${proyectoId}/resumen${params}`, {
      headers: this.authHeaders(),
    });
  }

  marcar(proyectoId: number, actividadId: number, dto: CumplimientoMarcarDto): Observable<CumplimientoItemDto> {
    return this.http.patch<CumplimientoItemDto>(
      `${this.base}/proyecto/${proyectoId}/actividades/${actividadId}`,
      dto,
      { headers: this.authHeaders() },
    );
  }
}
