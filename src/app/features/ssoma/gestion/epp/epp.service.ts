import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  EppCategoriaDto,
  EppCategoriaUpsertDto,
  EppFamiliaDto,
  EppFamiliaUpsertDto,
  EppItemDetalleDto,
  EppItemListDto,
  EppItemUpsertDto,
  EppModeloUpsertDto,
  EppPedidoCreateDto,
  EppPedidoDetalleDto,
  EppPedidoListDto,
} from './epp.dtos';

@Injectable({ providedIn: 'root' })
export class EppService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/epp`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  // ─── Categorías ────────────────────────────────────────────────────────────

  getCategorias(): Observable<EppCategoriaDto[]> {
    return this.http.get<EppCategoriaDto[]>(`${this.base}/categorias`, { headers: this.authHeaders() });
  }

  createCategoria(dto: EppCategoriaUpsertDto): Observable<EppCategoriaDto> {
    return this.http.post<EppCategoriaDto>(`${this.base}/categorias`, dto, { headers: this.authHeaders() });
  }

  updateCategoria(categoriaId: number, dto: EppCategoriaUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/categorias/${categoriaId}`, dto, { headers: this.authHeaders() });
  }

  setCategoriaActivo(categoriaId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/categorias/${categoriaId}/activo?activo=${activo}`, null, {
      headers: this.authHeaders(),
    });
  }

  deleteCategoria(categoriaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categorias/${categoriaId}`, { headers: this.authHeaders() });
  }

  // ─── Familias ──────────────────────────────────────────────────────────────

  getFamilias(): Observable<EppFamiliaDto[]> {
    return this.http.get<EppFamiliaDto[]>(`${this.base}/familias`, { headers: this.authHeaders() });
  }

  createFamilia(dto: EppFamiliaUpsertDto): Observable<EppFamiliaDto> {
    return this.http.post<EppFamiliaDto>(`${this.base}/familias`, dto, { headers: this.authHeaders() });
  }

  updateFamilia(familiaId: number, dto: EppFamiliaUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/familias/${familiaId}`, dto, { headers: this.authHeaders() });
  }

  setFamiliaActivo(familiaId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/familias/${familiaId}/activo?activo=${activo}`, null, {
      headers: this.authHeaders(),
    });
  }

  deleteFamilia(familiaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/familias/${familiaId}`, { headers: this.authHeaders() });
  }

  // ─── Ítems ─────────────────────────────────────────────────────────────────

  getItems(): Observable<EppItemListDto[]> {
    return this.http.get<EppItemListDto[]>(this.base, { headers: this.authHeaders() });
  }

  getItemDetalle(itemId: number): Observable<EppItemDetalleDto> {
    return this.http.get<EppItemDetalleDto>(`${this.base}/${itemId}`, { headers: this.authHeaders() });
  }

  createItem(dto: EppItemUpsertDto): Observable<EppItemDetalleDto> {
    return this.http.post<EppItemDetalleDto>(this.base, dto, { headers: this.authHeaders() });
  }

  updateItem(itemId: number, dto: EppItemUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${itemId}`, dto, { headers: this.authHeaders() });
  }

  setItemActivo(itemId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${itemId}/activo?activo=${activo}`, null, {
      headers: this.authHeaders(),
    });
  }

  subirImagenItem(itemId: number, archivo: File): Observable<{ imagenUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ imagenUrl: string }>(`${this.base}/${itemId}/imagen`, form, {
      headers: this.authHeaders(),
    });
  }

  subirFichaTecnica(itemId: number, archivo: File): Observable<{ fichaTecnicaUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ fichaTecnicaUrl: string }>(`${this.base}/${itemId}/ficha-tecnica`, form, {
      headers: this.authHeaders(),
    });
  }

  quitarFichaTecnica(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${itemId}/ficha-tecnica`, { headers: this.authHeaders() });
  }

  // ─── Modelos / marcas ──────────────────────────────────────────────────────

  createModelo(itemId: number, dto: EppModeloUpsertDto): Observable<EppItemDetalleDto> {
    return this.http.post<EppItemDetalleDto>(`${this.base}/${itemId}/modelos`, dto, { headers: this.authHeaders() });
  }

  updateModelo(modeloId: number, dto: EppModeloUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/modelos/${modeloId}`, dto, { headers: this.authHeaders() });
  }

  setModeloActivo(modeloId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/modelos/${modeloId}/activo?activo=${activo}`, null, {
      headers: this.authHeaders(),
    });
  }

  subirImagenModelo(modeloId: number, archivo: File): Observable<{ imagenUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ imagenUrl: string }>(`${this.base}/modelos/${modeloId}/imagen`, form, {
      headers: this.authHeaders(),
    });
  }

  // ─── Pedidos ───────────────────────────────────────────────────────────────

  getPedidos(): Observable<EppPedidoListDto[]> {
    return this.http.get<EppPedidoListDto[]>(`${this.base}/pedidos`, { headers: this.authHeaders() });
  }

  getPedidoDetalle(pedidoId: number): Observable<EppPedidoDetalleDto> {
    return this.http.get<EppPedidoDetalleDto>(`${this.base}/pedidos/${pedidoId}`, { headers: this.authHeaders() });
  }

  createPedido(dto: EppPedidoCreateDto): Observable<EppPedidoDetalleDto> {
    return this.http.post<EppPedidoDetalleDto>(`${this.base}/pedidos`, dto, { headers: this.authHeaders() });
  }
}
