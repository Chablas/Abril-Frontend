import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ChecklistPlantillaListDto,
  ChecklistPlantillaDetalleDto,
  ChecklistPlantillaItemDto,
  ChecklistPlantillaItemCreateDto,
  ChecklistPlantillaItemEditDto,
  ChecklistProyectoResumenDto,
  ChecklistProyectoDetalleDto,
  ChecklistItemToggleDto,
  ChecklistActivarDto,
  ChecklistNoAplicaDto,
  ChecklistPartidaDto,
  ChecklistPartidaUpsertDto,
  ChecklistItemImagenDto,
  ChecklistPlantillaUpsertDto,
} from './checklist.dtos';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/checklist`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getMiProyectoActual(): Observable<{ proyectoId: number | null }> {
    return this.http.get<{ proyectoId: number | null }>(`${this.base}/mi-proyecto-actual`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Plantillas ──────────────────────────────────────────────────────────────

  getPlantillas(): Observable<ChecklistPlantillaListDto[]> {
    return this.http.get<ChecklistPlantillaListDto[]>(`${this.base}/plantillas`, {
      headers: this.authHeaders(),
    });
  }

  getPlantillaDetalle(plantillaId: number): Observable<ChecklistPlantillaDetalleDto> {
    return this.http.get<ChecklistPlantillaDetalleDto>(`${this.base}/plantillas/${plantillaId}`, {
      headers: this.authHeaders(),
    });
  }

  addItemToPlantilla(
    plantillaId: number,
    dto: ChecklistPlantillaItemCreateDto,
  ): Observable<ChecklistPlantillaItemDto> {
    return this.http.post<ChecklistPlantillaItemDto>(
      `${this.base}/plantillas/${plantillaId}/items`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  createPlantilla(dto: ChecklistPlantillaUpsertDto): Observable<ChecklistPlantillaDetalleDto> {
    return this.http.post<ChecklistPlantillaDetalleDto>(`${this.base}/plantillas`, dto, {
      headers: this.authHeaders(),
    });
  }

  updatePlantilla(plantillaId: number, dto: ChecklistPlantillaUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/plantillas/${plantillaId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  updatePlantillaItem(itemId: number, dto: ChecklistPlantillaItemEditDto): Observable<void> {
    return this.http.put<void>(`${this.base}/plantillas/items/${itemId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  setOrdenItem(itemId: number, orden: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/plantillas/items/${itemId}/orden`, { orden }, {
      headers: this.authHeaders(),
    });
  }

  // ─── Partidas (etapas constructivas) ──────────────────────────────────────────

  getPartidas(): Observable<ChecklistPartidaDto[]> {
    return this.http.get<ChecklistPartidaDto[]>(`${this.base}/partidas`, {
      headers: this.authHeaders(),
    });
  }

  createPartida(dto: ChecklistPartidaUpsertDto): Observable<ChecklistPartidaDto> {
    return this.http.post<ChecklistPartidaDto>(`${this.base}/partidas`, dto, {
      headers: this.authHeaders(),
    });
  }

  updatePartida(partidaId: number, dto: ChecklistPartidaUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/partidas/${partidaId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  deletePartida(partidaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/partidas/${partidaId}`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Imágenes de referencia de un item de plantilla ───────────────────────────

  subirImagenReferencia(itemId: number, file: File): Observable<ChecklistItemImagenDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ChecklistItemImagenDto>(
      `${this.base}/plantillas/items/${itemId}/imagenes`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  eliminarImagenReferencia(imagenId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plantillas/items/imagenes/${imagenId}`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Proyecto ────────────────────────────────────────────────────────────────

  getResumenProyecto(proyectoId: number): Observable<ChecklistProyectoResumenDto> {
    return this.http.get<ChecklistProyectoResumenDto>(
      `${this.base}/proyecto/${proyectoId}/resumen`,
      { headers: this.authHeaders() },
    );
  }

  getChecklistDetalle(checklistProyectoId: number): Observable<ChecklistProyectoDetalleDto> {
    return this.http.get<ChecklistProyectoDetalleDto>(`${this.base}/${checklistProyectoId}`, {
      headers: this.authHeaders(),
    });
  }

  activarChecklist(proyectoId: number, dto: ChecklistActivarDto): Observable<ChecklistProyectoDetalleDto> {
    return this.http.post<ChecklistProyectoDetalleDto>(
      `${this.base}/proyecto/${proyectoId}/activar`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  desactivarChecklist(checklistProyectoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${checklistProyectoId}`, {
      headers: this.authHeaders(),
    });
  }

  marcarNoAplica(checklistProyectoId: number, dto: ChecklistNoAplicaDto): Observable<void> {
    return this.http.post<void>(`${this.base}/${checklistProyectoId}/no-aplica`, dto, {
      headers: this.authHeaders(),
    });
  }

  reactivarChecklist(checklistProyectoId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${checklistProyectoId}/reactivar`, {}, {
      headers: this.authHeaders(),
    });
  }

  subirAdjuntoItem(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/items/adjunto`, formData, {
      headers: this.authHeaders(),
    });
  }

  toggleItem(
    checklistProyectoItemId: number,
    dto: ChecklistItemToggleDto,
  ): Observable<{ porcentaje: number; estado: string }> {
    return this.http.patch<{ porcentaje: number; estado: string }>(
      `${this.base}/items/${checklistProyectoItemId}`,
      dto,
      { headers: this.authHeaders() },
    );
  }
}
