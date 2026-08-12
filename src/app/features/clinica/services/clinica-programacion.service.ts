import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClinicaAccionDto,
  CreateProgramacionDto,
  ProgramacionClinicaDto,
  ProgramacionDestinatariosPreviewDto,
} from '../dtos/clinica.model';
import { hoyIsoLocal } from '../../../shared/utils/fecha-local.util';

function buildClinicaHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

const PROGRAMACIONES_BASE = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/programaciones`;

@Injectable({ providedIn: 'root' })
export class ClinicaProgramacionService {
  constructor(private http: HttpClient) {}

  getProgramacionesHoy(clinicaId?: number): Observable<ProgramacionClinicaDto[]> {
    const fecha = hoyIsoLocal();
    const params: Record<string, string | number> = { desde: fecha, hasta: fecha, pageSize: 500 };
    if (clinicaId) params['clinicaId'] = clinicaId;
    return this.http
      .get<PagedResponse<ProgramacionClinicaDto>>(PROGRAMACIONES_BASE, {
        headers: buildClinicaHeaders(),
        params,
      })
      .pipe(map((res) => res?.data ?? []));
  }

  getProgramacionesFiltradas(params: {
    desde?: string;
    hasta?: string;
    estado?: string;
    pageSize?: number;
  }): Observable<ProgramacionClinicaDto[]> {
    let httpParams = new HttpParams();
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    httpParams = httpParams.set('pageSize', String(params.pageSize ?? 500));
    return this.http
      .get<PagedResponse<ProgramacionClinicaDto>>(PROGRAMACIONES_BASE, {
        headers: buildClinicaHeaders(),
        params: httpParams,
      })
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * A quién le llegará el correo si se programa el EMO ahora. Depende de la clínica elegida
   * (sus correos de contacto), por eso se vuelve a pedir cuando el usuario la cambia.
   */
  getDestinatarios(
    workerId: number,
    clinicaId: number | null,
  ): Observable<ProgramacionDestinatariosPreviewDto> {
    let params = new HttpParams().set('workerId', workerId);
    if (clinicaId) params = params.set('clinicaId', clinicaId);
    return this.http.get<ProgramacionDestinatariosPreviewDto>(`${PROGRAMACIONES_BASE}/destinatarios`, {
      headers: buildClinicaHeaders(),
      params,
    });
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
