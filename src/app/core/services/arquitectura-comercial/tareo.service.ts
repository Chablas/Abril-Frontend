import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TareoEnrolamientoEstadoDTO,
  TareoEnrolamientoRequestDTO,
  TareoMarcarRequestDTO,
  TareoRegistroDTO,
  TareoMiTareoHoyDTO,
  TareoRegistroListResponseDTO,
  TareoFiltroParams,
  TareoRevisarRequestDTO,
  TareoReporteSemanalDTO,
} from '../../dtos/arquitectura-comercial/tareo.model';

@Injectable({ providedIn: 'root' })
export class TareoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/tareo`;

  constructor(private http: HttpClient) {}

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getEnrolamientoEstado(): Observable<TareoEnrolamientoEstadoDTO> {
    return this.http.get<TareoEnrolamientoEstadoDTO>(`${this.apiUrl}/enrolamiento/estado`, {
      headers: this.authHeaders(),
    });
  }

  enrolar(body: TareoEnrolamientoRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/enrolamiento`, body, {
      headers: this.authHeaders(),
    });
  }

  /** idempotencyKey debe generarse UNA vez por intento de marcado (crypto.randomUUID()) y
   * reenviarse igual en reintentos de red, para que el backend no duplique el registro. */
  marcar(body: TareoMarcarRequestDTO, idempotencyKey: string): Observable<TareoRegistroDTO> {
    return this.http.post<TareoRegistroDTO>(`${this.apiUrl}/marcar`, body, {
      headers: this.authHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  getMiTareoHoy(): Observable<TareoMiTareoHoyDTO> {
    return this.http.get<TareoMiTareoHoyDTO>(`${this.apiUrl}/mi-tareo/hoy`, {
      headers: this.authHeaders(),
    });
  }

  getRegistros(filtro: TareoFiltroParams): Observable<TareoRegistroListResponseDTO> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('porPagina', filtro.porPagina);
    if (filtro.workerId) params = params.set('workerId', filtro.workerId);
    if (filtro.proyectoId) params = params.set('proyectoId', filtro.proyectoId);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<TareoRegistroListResponseDTO>(this.apiUrl + '/registros', {
      params,
      headers: this.authHeaders(),
    });
  }

  revisar(id: number, body: TareoRevisarRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/registros/${id}/revisar`, body, {
      headers: this.authHeaders(),
    });
  }

  getReporteSemanal(semanaLunes: string, proyectoId?: number | null): Observable<TareoReporteSemanalDTO[]> {
    let params = new HttpParams().set('semana', semanaLunes);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<TareoReporteSemanalDTO[]>(`${this.apiUrl}/reporte-semanal`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Igual patrón que RevisionesService.fotoContenidoUrl: token vía query string porque un
   * <img src> no puede mandar el header Authorization. */
  fotoUrlConToken(url: string): string {
    if (!url) return url;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}access_token=${encodeURIComponent(token)}`;
  }
}
