import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  DocumentTypeDto,
  WorkerCategoryDto,
  WorkerDatosBasicosDto,
  WorkerUpsertDto,
} from '../dtos/emo.model';

@Injectable({ providedIn: 'root' })
export class WorkerService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  createWorker(dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.post(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  updateWorker(id: number, dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  /** Catálogo de tipos de documento para el select del modal de edición. */
  getDocumentTypes(): Observable<DocumentTypeDto[]> {
    return this.http.get<DocumentTypeDto[]>(`${this.apiUrl}/document-types`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Catálogo workers_category (categoría normalizada) para el select del modal de edición. */
  getWorkerCategories(): Observable<WorkerCategoryDto[]> {
    return this.http.get<WorkerCategoryDto[]>(`${this.apiUrl}/worker-categories`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Edición mínima: nombre, tipo/número de documento y cumpleaños (solo Person). */
  updateDatosBasicos(id: number, dto: WorkerDatosBasicosDto): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/datos-basicos`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  retirarWorker(id: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${id}/retirar`, {}, { headers: buildAuthHeaders() });
  }
}
