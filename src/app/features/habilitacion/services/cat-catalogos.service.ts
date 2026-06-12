import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CatCategoriaAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface CatOcupacionAdminDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatCatalogosService {
  private base = `${environment.apiUrl}api/v1/habilitacion/catalogos`;

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<CatCategoriaAdminDto[]> {
    return this.http.get<CatCategoriaAdminDto[]>(`${this.base}/categorias/admin`);
  }
  crearCategoria(nombre: string): Observable<CatCategoriaAdminDto> {
    return this.http.post<CatCategoriaAdminDto>(`${this.base}/categorias`, { nombre });
  }
  actualizarCategoria(id: number, nombre: string): Observable<CatCategoriaAdminDto> {
    return this.http.put<CatCategoriaAdminDto>(`${this.base}/categorias/${id}`, { nombre });
  }
  toggleCategoria(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/categorias/${id}/toggle`, { activo });
  }

  getOcupaciones(): Observable<CatOcupacionAdminDto[]> {
    return this.http.get<CatOcupacionAdminDto[]>(`${this.base}/ocupaciones/admin`);
  }
  crearOcupacion(nombre: string): Observable<CatOcupacionAdminDto> {
    return this.http.post<CatOcupacionAdminDto>(`${this.base}/ocupaciones`, { nombre });
  }
  actualizarOcupacion(id: number, nombre: string): Observable<CatOcupacionAdminDto> {
    return this.http.put<CatOcupacionAdminDto>(`${this.base}/ocupaciones/${id}`, { nombre });
  }
  toggleOcupacion(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/ocupaciones/${id}/toggle`, { activo });
  }
}
