import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { buildAuthHeaders } from '../../salud-ocupacional/services/http-base';
import {
  PetListItemDto,
  PetDetalleDto,
  PetPasoDto,
  CrearPetRequest,
  ActualizarPetRequest,
  CrearPetPasoRequest,
  ActualizarPetPasoRequest,
  ReordenarPasosRequest,
  PetsImportPreviewDto,
  ConfirmarImportacionRequest,
} from './pets.dtos';

@Injectable({ providedIn: 'root' })
export class PetsService {
  private base = `${environment.apiUrl}api/v1/pets`;

  constructor(private http: HttpClient) {}

  getList(): Observable<PetListItemDto[]> {
    return this.http.get<PetListItemDto[]>(this.base, { headers: buildAuthHeaders() });
  }

  getDetalle(id: number): Observable<PetDetalleDto> {
    return this.http.get<PetDetalleDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  getPasos(id: number): Observable<PetPasoDto[]> {
    return this.http.get<PetPasoDto[]>(`${this.base}/${id}/pasos`, { headers: buildAuthHeaders() });
  }

  crear(req: CrearPetRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, req, { headers: buildAuthHeaders() });
  }

  actualizar(id: number, req: ActualizarPetRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, req, { headers: buildAuthHeaders() });
  }

  agregarPaso(id: number, req: CrearPetPasoRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${id}/pasos`, req, { headers: buildAuthHeaders() });
  }

  actualizarPaso(id: number, pasoId: number, req: ActualizarPetPasoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/pasos/${pasoId}`, req, { headers: buildAuthHeaders() });
  }

  eliminarPaso(id: number, pasoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/pasos/${pasoId}`, { headers: buildAuthHeaders() });
  }

  reordenarPasos(id: number, req: ReordenarPasosRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/pasos/reordenar`, req, { headers: buildAuthHeaders() });
  }

  previewImportarDocx(file: File): Observable<PetsImportPreviewDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<PetsImportPreviewDto>(`${this.base}/importar-docx/preview`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  confirmarImportarDocx(id: number, req: ConfirmarImportacionRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/importar-docx/confirmar`, req, {
      headers: buildAuthHeaders(),
    });
  }

  subirImagenPaso(id: number, pasoId: number, file: File): Observable<{ imagenUrl: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ imagenUrl: string }>(
      `${this.base}/${id}/pasos/${pasoId}/imagen`,
      fd,
      { headers: buildAuthHeaders() },
    );
  }
}
