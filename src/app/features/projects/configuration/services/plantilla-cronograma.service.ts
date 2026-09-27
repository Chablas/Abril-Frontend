import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PlantillaDto,
  PlantillaItemDto,
  CrearPlantillaItemRequest,
  EditarPlantillaItemRequest,
} from '../dtos/plantilla-cronograma.dtos';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class PlantillaCronogramaService {
  private readonly base = `${environment.apiUrl}api/v1/cronograma-actividades/plantillas`;

  constructor(private http: HttpClient) {}

  getByTipo(tipoCronograma: string): Observable<PlantillaDto> {
    return this.http.get<PlantillaDto>(`${this.base}/${tipoCronograma}`, {
      headers: buildAuthHeaders(),
    });
  }

  crearItem(body: CrearPlantillaItemRequest): Observable<PlantillaItemDto> {
    return this.http.post<PlantillaItemDto>(this.base, body, {
      headers: buildAuthHeaders(),
    });
  }

  editarItem(id: number, body: EditarPlantillaItemRequest): Observable<PlantillaItemDto> {
    return this.http.put<PlantillaItemDto>(`${this.base}/${id}`, body, {
      headers: buildAuthHeaders(),
    });
  }

  eliminarItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }
}
