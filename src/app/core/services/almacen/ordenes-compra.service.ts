import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AlmacenOrdenCompraListItemDTO,
  AlmacenOrdenCompraListResponseDTO,
  AlmacenOrdenCompraQueryParams,
  CreateAlmacenOrdenCompraBody,
} from '../../dtos/almacen/almacen.model';

@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/almacen/ordenes-compra`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getOrdenesCompra(query: AlmacenOrdenCompraQueryParams): Observable<AlmacenOrdenCompraListResponseDTO> {
    let params = new HttpParams().set('pagina', query.pagina).set('porPagina', query.porPagina);
    if (query.proyectoId) params = params.set('proyectoId', query.proyectoId);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<AlmacenOrdenCompraListResponseDTO>(this.apiUrl, { params, headers: this.authHeaders() });
  }

  crearOrdenCompra(body: CreateAlmacenOrdenCompraBody, archivo: File): Observable<AlmacenOrdenCompraListItemDTO> {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined) form.append(key, String(value));
    });
    form.append('archivo', archivo);
    return this.http.post<AlmacenOrdenCompraListItemDTO>(this.apiUrl, form, { headers: this.authHeaders() });
  }

  archivoUrlCompleta(url: string): string {
    return `${environment.apiUrl}${url.replace(/^\//, '')}`;
  }
}
