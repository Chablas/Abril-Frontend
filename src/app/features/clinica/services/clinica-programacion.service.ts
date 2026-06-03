import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicaAccionDto, CreateProgramacionDto, ProgramacionClinicaDto } from '../dtos/clinica.model';

function buildClinicaHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const PROGRAMACIONES_BASE = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/programaciones`;

@Injectable({ providedIn: 'root' })
export class ClinicaProgramacionService {
  constructor(private http: HttpClient) {}

  getProgramacionesHoy(clinicaId?: number): Observable<ProgramacionClinicaDto[]> {
    const fecha = new Date().toISOString().split('T')[0];
    const params: Record<string, string | number> = { desde: fecha, hasta: fecha };
    if (clinicaId) params['clinicaId'] = clinicaId;
    return this.http.get<ProgramacionClinicaDto[]>(PROGRAMACIONES_BASE, {
      headers: buildClinicaHeaders(),
      params,
    });
  }

  getProgramacionesFiltradas(params: {
    desde?: string;
    hasta?: string;
    estado?: string;
  }): Observable<ProgramacionClinicaDto[]> {
    let httpParams = new HttpParams();
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    return this.http.get<ProgramacionClinicaDto[]>(PROGRAMACIONES_BASE, {
      headers: buildClinicaHeaders(),
      params: httpParams,
    }).pipe(tap(raw => console.log('[CPS] raw HTTP response item[0]:', raw[0])));
  }

  programarEmo(dto: CreateProgramacionDto): Observable<ProgramacionClinicaDto> {
    return this.http.post<ProgramacionClinicaDto>(PROGRAMACIONES_BASE, dto, {
      headers: buildClinicaHeaders(),
    });
  }

  accionClinica(id: number, body: ClinicaAccionDto): Observable<unknown> {
    return this.http.patch(`${PROGRAMACIONES_BASE}/${id}/clinica-accion`, body, {
      headers: buildClinicaHeaders(),
    });
  }
}
