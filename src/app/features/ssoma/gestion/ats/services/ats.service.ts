import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  AtsInitDto,
  AtsPasoDto,
  AtsGuardarRequestDto,
  AtsFirmarRequestDto,
  AtsResponseDto,
  AtsFiltroDto,
  AtsListResponseDto,
  AtsPlantillaDto,
  AtsPlantillaGuardarRequestDto,
  AtsPuestoDto,
  AtsPasoPuestoDto,
  AtsAutorizacionTrabajadorDto,
  AtsFirmarVistoRequestDto,
  AtsPeligroDto,
} from '../dtos/ats.dtos';

function authHeaders(): HttpHeaders {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
}

@Injectable({ providedIn: 'root' })
export class AtsService {
  private base = `${environment.apiUrl}api/v1/ssoma/ats`;

  constructor(private http: HttpClient) {}

  getInit(): Observable<AtsInitDto> {
    return this.http.get<AtsInitDto>(`${this.base}/init`, { headers: authHeaders() });
  }

  crear(dto: AtsGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: authHeaders() });
  }

  editar(id: number, dto: AtsGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: authHeaders() });
  }

  getPorId(id: number): Observable<AtsResponseDto> {
    return this.http.get<AtsResponseDto>(`${this.base}/${id}`, { headers: authHeaders() });
  }

  firmar(id: number, body: AtsFirmarRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/firmar`, body, { headers: authHeaders() });
  }

  listar(filtro: AtsFiltroDto): Observable<AtsListResponseDto> {
    let params = new HttpParams();
    if (filtro.proyectoId) params = params.set('proyectoId', filtro.proyectoId);
    if (filtro.workerId) params = params.set('workerId', filtro.workerId);
    if (filtro.fechaDesde) params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro.fechaHasta) params = params.set('fechaHasta', filtro.fechaHasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.page) params = params.set('page', filtro.page);
    return this.http.get<AtsListResponseDto>(this.base, { headers: authHeaders(), params });
  }

  getPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { headers: authHeaders(), responseType: 'blob' });
  }

  getPlantillaAutorizacionPdf(workerId: number): Observable<Blob> {
    return this.http.get(`${this.base}/trabajadores/${workerId}/autorizacion/pdf`, { headers: authHeaders(), responseType: 'blob' });
  }

  firmarAutorizacion(id: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/autorizar`, body, { headers: authHeaders() });
  }

  firmarVistoSsoma(id: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/visto-bueno-ssoma`, body, { headers: authHeaders() });
  }

  // ── Administración de plantillas ──────────────────────────────────────

  getPuestos(): Observable<AtsPuestoDto[]> {
    return this.http.get<AtsPuestoDto[]>(`${this.base}/puestos`, { headers: authHeaders() });
  }

  crearPaso(categoriaId: number, texto: string): Observable<AtsPasoDto> {
    return this.http.post<AtsPasoDto>(`${this.base}/pasos`, { categoriaId, texto }, { headers: authHeaders() });
  }

  getPasoPuestoMapeo(): Observable<AtsPasoPuestoDto[]> {
    return this.http.get<AtsPasoPuestoDto[]>(`${this.base}/pasos-puesto`, { headers: authHeaders() });
  }

  setPasoPuestos(pasoId: number, puestoIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/pasos-puesto/${pasoId}`, puestoIds, { headers: authHeaders() });
  }

  getPlantillas(): Observable<AtsPlantillaDto[]> {
    return this.http.get<AtsPlantillaDto[]>(`${this.base}/plantillas`, { headers: authHeaders() });
  }

  crearPlantilla(dto: AtsPlantillaGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/plantillas`, dto, { headers: authHeaders() });
  }

  editarPlantilla(id: number, dto: AtsPlantillaGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/plantillas/${id}`, dto, { headers: authHeaders() });
  }

  desactivarPlantilla(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/plantillas/${id}`, { headers: authHeaders() });
  }

  getPeligros(): Observable<AtsPeligroDto[]> {
    return this.http.get<AtsPeligroDto[]>(`${this.base}/peligros`, { headers: authHeaders() });
  }

  setRiesgoRequierePetar(riesgoId: number, requierePetar: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/riesgos/${riesgoId}/requiere-petar`,
      { requierePetar },
      { headers: authHeaders() },
    );
  }

  // ── Autorización de uso de firma digital e imagen (firmada en físico) — gate para poder hacer ATS ──

  /** El propio trabajador la consulta ANTES de abrir "Nuevo ATS", para mostrar el bloqueo
   *  claro en vez de dejarlo llenar todo el wizard y recién fallar al guardar. */
  getMiAutorizacion(): Observable<{ tieneAutorizacion: boolean }> {
    return this.http.get<{ tieneAutorizacion: boolean }>(`${this.base}/mi-autorizacion`, { headers: authHeaders() });
  }

  getTrabajadoresAutorizacion(): Observable<AtsAutorizacionTrabajadorDto[]> {
    return this.http.get<AtsAutorizacionTrabajadorDto[]>(`${this.base}/trabajadores-autorizacion`, { headers: authHeaders() });
  }

  subirAutorizacionPermiso(workerId: number, archivo: File): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ message: string }>(`${this.base}/trabajadores/${workerId}/autorizacion`, formData, {
      headers: authHeaders(),
    });
  }
}
