import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AlmacenDashboardDTO,
  AlmacenFiltrosDTO,
  AlmacenMaterialDTO,
  AlmacenMovimientoListItemDTO,
  AlmacenMovimientoListResponseDTO,
  AlmacenMovimientosQueryParams,
  AlmacenStockDTO,
  CreateAlmacenMaterialBody,
  CreateAlmacenMovimientoBody,
  ImportarMovimientosResultDTO,
  UpdateAlmacenMaterialBody,
} from '../../dtos/almacen/almacen.model';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/almacen`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getFiltros(): Observable<AlmacenFiltrosDTO> {
    return this.http.get<AlmacenFiltrosDTO>(`${this.apiUrl}/materiales/filtros`, { headers: this.authHeaders() });
  }

  getMateriales(soloActivos = false): Observable<AlmacenMaterialDTO[]> {
    const params = new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<AlmacenMaterialDTO[]>(`${this.apiUrl}/materiales`, { params, headers: this.authHeaders() });
  }

  crearMaterial(body: CreateAlmacenMaterialBody): Observable<AlmacenMaterialDTO> {
    return this.http.post<AlmacenMaterialDTO>(`${this.apiUrl}/materiales`, body, { headers: this.authHeaders() });
  }

  actualizarMaterial(id: number, body: UpdateAlmacenMaterialBody): Observable<AlmacenMaterialDTO> {
    return this.http.put<AlmacenMaterialDTO>(`${this.apiUrl}/materiales/${id}`, body, { headers: this.authHeaders() });
  }

  getMovimientos(query: AlmacenMovimientosQueryParams): Observable<AlmacenMovimientoListResponseDTO> {
    let params = new HttpParams().set('pagina', query.pagina).set('porPagina', query.porPagina);
    if (query.proyectoId) params = params.set('proyectoId', query.proyectoId);
    if (query.materialId) params = params.set('materialId', query.materialId);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    return this.http.get<AlmacenMovimientoListResponseDTO>(`${this.apiUrl}/movimientos`, { params, headers: this.authHeaders() });
  }

  crearMovimiento(body: CreateAlmacenMovimientoBody): Observable<AlmacenMovimientoListItemDTO> {
    return this.http.post<AlmacenMovimientoListItemDTO>(`${this.apiUrl}/movimientos`, body, { headers: this.authHeaders() });
  }

  importarMovimientos(archivo: File): Observable<ImportarMovimientosResultDTO> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<ImportarMovimientosResultDTO>(`${this.apiUrl}/movimientos/importar`, form, { headers: this.authHeaders() });
  }

  getStock(proyectoId: number | null): Observable<AlmacenStockDTO> {
    let params = new HttpParams();
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<AlmacenStockDTO>(`${this.apiUrl}/stock`, { params, headers: this.authHeaders() });
  }

  getDashboard(proyectoId: number | null, diasVentana = 90): Observable<AlmacenDashboardDTO> {
    let params = new HttpParams().set('diasVentana', diasVentana);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<AlmacenDashboardDTO>(`${this.apiUrl}/dashboard`, { params, headers: this.authHeaders() });
  }
}
