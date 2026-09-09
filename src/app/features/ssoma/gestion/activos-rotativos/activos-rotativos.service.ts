import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActivoRotativoCategoriaDto,
  ActivoRotativoCategoriaUpsertDto,
  ActivoRotativoListDto,
  ActivoRotativoDetalleDto,
  ActivoRotativoUpsertDto,
  ActivoRotativoMoverDto,
} from './activos-rotativos.dtos';

@Injectable({ providedIn: 'root' })
export class ActivosRotativosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/activos-rotativos`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  // ─── Categorías ──────────────────────────────────────────────────────────────

  getCategorias(): Observable<ActivoRotativoCategoriaDto[]> {
    return this.http.get<ActivoRotativoCategoriaDto[]>(`${this.base}/categorias`, {
      headers: this.authHeaders(),
    });
  }

  createCategoria(dto: ActivoRotativoCategoriaUpsertDto): Observable<ActivoRotativoCategoriaDto> {
    return this.http.post<ActivoRotativoCategoriaDto>(`${this.base}/categorias`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateCategoria(categoriaId: number, dto: ActivoRotativoCategoriaUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/categorias/${categoriaId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  // ─── Activos ─────────────────────────────────────────────────────────────────

  getActivos(): Observable<ActivoRotativoListDto[]> {
    return this.http.get<ActivoRotativoListDto[]>(this.base, { headers: this.authHeaders() });
  }

  getActivoDetalle(activoId: number): Observable<ActivoRotativoDetalleDto> {
    return this.http.get<ActivoRotativoDetalleDto>(`${this.base}/${activoId}`, {
      headers: this.authHeaders(),
    });
  }

  createActivo(dto: ActivoRotativoUpsertDto): Observable<ActivoRotativoDetalleDto> {
    return this.http.post<ActivoRotativoDetalleDto>(this.base, dto, { headers: this.authHeaders() });
  }

  updateActivo(activoId: number, dto: ActivoRotativoUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${activoId}`, dto, { headers: this.authHeaders() });
  }

  moverActivo(activoId: number, dto: ActivoRotativoMoverDto): Observable<ActivoRotativoDetalleDto> {
    return this.http.post<ActivoRotativoDetalleDto>(`${this.base}/${activoId}/mover`, dto, {
      headers: this.authHeaders(),
    });
  }
}
