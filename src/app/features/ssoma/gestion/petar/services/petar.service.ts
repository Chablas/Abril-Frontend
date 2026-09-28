import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  PetarInitDto,
  PetarGuardarRequestDto,
  PetarFirmarRequestDto,
  PetarFirmarVistoRequestDto,
  PetarCerrarRequestDto,
  PetarResponseDto,
  PetarFiltroDto,
  PetarListResponseDto,
} from '../dtos/petar.dtos';

function authHeaders(): HttpHeaders {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
}

@Injectable({ providedIn: 'root' })
export class PetarService {
  private base = `${environment.apiUrl}api/v1/ssoma/petar`;

  constructor(private http: HttpClient) {}

  getInit(atsId: number): Observable<PetarInitDto> {
    return this.http.get<PetarInitDto>(`${this.base}/init/${atsId}`, { headers: authHeaders() });
  }

  crear(dto: PetarGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: authHeaders() });
  }

  editar(id: number, dto: PetarGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: authHeaders() });
  }

  getPorId(id: number): Observable<PetarResponseDto> {
    return this.http.get<PetarResponseDto>(`${this.base}/${id}`, { headers: authHeaders() });
  }

  listar(filtro: PetarFiltroDto): Observable<PetarListResponseDto> {
    let params = new HttpParams();
    if (filtro.proyectoId) params = params.set('proyectoId', filtro.proyectoId);
    if (filtro.workerId) params = params.set('workerId', filtro.workerId);
    if (filtro.atsId) params = params.set('atsId', filtro.atsId);
    if (filtro.fechaDesde) params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro.fechaHasta) params = params.set('fechaHasta', filtro.fechaHasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.page) params = params.set('page', filtro.page);
    return this.http.get<PetarListResponseDto>(this.base, { headers: authHeaders(), params });
  }

  firmar(id: number, body: PetarFirmarRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/firmar`, body, { headers: authHeaders() });
  }

  firmarSupervisor(id: number, body: PetarFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/firmar-supervisor`, body, { headers: authHeaders() });
  }

  firmarVistoSsoma(id: number, body: PetarFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/visto-bueno-ssoma`, body, { headers: authHeaders() });
  }

  cerrar(id: number, body: PetarCerrarRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/cerrar`, body, { headers: authHeaders() });
  }

  getPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { headers: authHeaders(), responseType: 'blob' });
  }
}
