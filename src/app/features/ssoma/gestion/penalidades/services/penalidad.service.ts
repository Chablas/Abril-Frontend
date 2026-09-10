import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import {
  PagedResult,
  PenalidadListQuery,
  PenalidadListItemDto,
  PenalidadDetalleDto,
  PenalidadRegistrarRequest,
  PenalidadRechazarRequest,
  PenalidadDescargaRequest,
  PenalidadEvaluarDescargoRequest,
  PenalidadDecidirGerenciaRequest,
  PenalidadApelarRequest,
  PenalidadDecidirApelacionRequest,
  PenalidadCreadaDto,
  InfraccionAdminDto,
  InfraccionUpsertRequest,
  UitAnioAdminDto,
  UitAnioUpsertRequest,
  GestionPreviaDto,
  GestionPreviaRegistrarRequest,
  ContextoEmpresaDto,
} from '../dtos/penalidad.dtos';

@Injectable({ providedIn: 'root' })
export class PenalidadService {
  private base = `${environment.apiUrl}api/v1/ssoma-penalidad`;
  private baseCatalogos = `${environment.apiUrl}api/v1/ssoma-penalidad-catalogos`;
  private baseGestionPrevia = `${environment.apiUrl}api/v1/ssoma-penalidad-gestion-previa`;

  constructor(private http: HttpClient) {}

  // ── Catálogos ────────────────────────────────────────────────────

  getInfracciones(): Observable<InfraccionAdminDto[]> {
    return this.http.get<InfraccionAdminDto[]>(`${this.base}/infracciones`, { headers: buildAuthHeaders() });
  }

  getInfraccionesAdmin(soloActivas = false): Observable<InfraccionAdminDto[]> {
    const params = new HttpParams().set('soloActivas', String(soloActivas));
    return this.http.get<InfraccionAdminDto[]>(`${this.baseCatalogos}/infracciones`, { params, headers: buildAuthHeaders() });
  }

  crearInfraccion(req: InfraccionUpsertRequest): Observable<InfraccionAdminDto> {
    return this.http.post<InfraccionAdminDto>(`${this.baseCatalogos}/infracciones`, req, { headers: buildAuthHeaders() });
  }

  actualizarInfraccion(id: number, req: InfraccionUpsertRequest): Observable<InfraccionAdminDto> {
    return this.http.put<InfraccionAdminDto>(`${this.baseCatalogos}/infracciones/${id}`, req, { headers: buildAuthHeaders() });
  }

  getUitAnios(): Observable<UitAnioAdminDto[]> {
    return this.http.get<UitAnioAdminDto[]>(`${this.baseCatalogos}/uit`, { headers: buildAuthHeaders() });
  }

  crearUitAnio(req: UitAnioUpsertRequest): Observable<UitAnioAdminDto> {
    return this.http.post<UitAnioAdminDto>(`${this.baseCatalogos}/uit`, req, { headers: buildAuthHeaders() });
  }

  actualizarUitAnio(id: number, req: UitAnioUpsertRequest): Observable<UitAnioAdminDto> {
    return this.http.put<UitAnioAdminDto>(`${this.baseCatalogos}/uit/${id}`, req, { headers: buildAuthHeaders() });
  }

  // ── Penalidad ────────────────────────────────────────────────────

  getList(q: PenalidadListQuery): Observable<PagedResult<PenalidadListItemDto>> {
    const params = this.buildParams(q);
    return this.http.get<PagedResult<PenalidadListItemDto>>(`${this.base}`, { params, headers: buildAuthHeaders() });
  }

  getDetalle(id: number): Observable<PenalidadDetalleDto> {
    return this.http.get<PenalidadDetalleDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  registrar(req: PenalidadRegistrarRequest): Observable<PenalidadCreadaDto> {
    return this.http.post<PenalidadCreadaDto>(`${this.base}`, req, { headers: buildAuthHeaders() });
  }

  aprobarResidente(id: number): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/aprobar-residente`, {}, { headers: buildAuthHeaders() });
  }

  rechazarResidente(id: number, req: PenalidadRechazarRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/rechazar-residente`, req, { headers: buildAuthHeaders() });
  }

  aprobarGerencia(id: number): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/aprobar-gerencia`, {}, { headers: buildAuthHeaders() });
  }

  rechazarGerencia(id: number, req: PenalidadRechazarRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/rechazar-gerencia`, req, { headers: buildAuthHeaders() });
  }

  subirDocumento(id: number, file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/${id}/documentos`, fd, { headers: buildAuthHeaders() });
  }

  presentarDescargo(id: number, req: PenalidadDescargaRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/descargo`, req, { headers: buildAuthHeaders() });
  }

  evaluarDescargo(id: number, req: PenalidadEvaluarDescargoRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/evaluar-descargo`, req, { headers: buildAuthHeaders() });
  }

  decidirGerencia(id: number, req: PenalidadDecidirGerenciaRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/decidir-gerencia`, req, { headers: buildAuthHeaders() });
  }

  apelar(id: number, req: PenalidadApelarRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/apelar`, req, { headers: buildAuthHeaders() });
  }

  decidirApelacion(id: number, req: PenalidadDecidirApelacionRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.base}/${id}/decidir-apelacion`, req, { headers: buildAuthHeaders() });
  }

  // ── Gestión previa ─────────────────────────────────────────────────

  getGestionPrevia(empresaId: number): Observable<GestionPreviaDto[]> {
    const params = new HttpParams().set('empresaId', String(empresaId));
    return this.http.get<GestionPreviaDto[]>(`${this.baseGestionPrevia}`, { params, headers: buildAuthHeaders() });
  }

  getContextoEmpresa(empresaId: number): Observable<ContextoEmpresaDto> {
    return this.http.get<ContextoEmpresaDto>(`${this.baseGestionPrevia}/contexto/${empresaId}`, { headers: buildAuthHeaders() });
  }

  registrarGestionPrevia(req: GestionPreviaRegistrarRequest): Observable<GestionPreviaDto> {
    return this.http.post<GestionPreviaDto>(`${this.baseGestionPrevia}`, req, { headers: buildAuthHeaders() });
  }

  subirAdjuntoGestionPrevia(empresaId: number, file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('empresaId', String(empresaId));
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseGestionPrevia}/documentos`, fd, { headers: buildAuthHeaders() });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private buildParams(q: object): HttpParams {
    let params = new HttpParams();
    for (const [key, val] of Object.entries(q)) {
      if (val !== undefined && val !== null) {
        params = params.set(key, String(val));
      }
    }
    return params;
  }
}
