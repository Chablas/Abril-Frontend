import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MilestoneScheduleGetDTO } from "../dtos/milestoneSchedule/milestoneSchedule.model";
import { MilestoneScheduleFakeDataDTO } from '../dtos/milestoneSchedule/milestoneScheduleFakeData.model';
import { MilestoneScheduleEditDTO } from '../dtos/milestoneSchedule/milestoneScheduleEdit.model';
import { MilestoneScheduleAddDTO } from '../dtos/milestoneSchedule/milestoneScheduleAdd.model';
import { MilestoneSimpleDTO } from '../dtos/milestone/milestoneSimple.model';

@Injectable({
  providedIn: 'root',
})
export class MilestoneScheduleService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/milestoneSchedule`;

  constructor(private http: HttpClient) {}

  getAllMilestoneSchedule(): Observable<MilestoneScheduleGetDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<MilestoneScheduleGetDTO[]>(`${this.apiUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getFakeData(): Observable<MilestoneScheduleFakeDataDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<MilestoneScheduleFakeDataDTO[]>(`${this.apiUrl}/fake-data`, {
      headers: { Authorization: `Bearer ${token}`},
    });
  }
  getByMilestoneScheduleHistoryId(filters: any): Observable<MilestoneScheduleGetDTO[]> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<MilestoneScheduleGetDTO[]>(`${this.apiUrl}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  marcarCritico(milestoneScheduleId: number, esHitoCritico: boolean): Observable<{ message: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${milestoneScheduleId}/marcar-critico`,
      { esHitoCritico },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** fechaRealFin en formato yyyy-MM-dd, o null para desmarcar como culminado. */
  culminar(milestoneScheduleId: number, fechaRealFin: string | null): Observable<{ message: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${milestoneScheduleId}/culminar`,
      { fechaRealFin },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /**
   * Edita un hito ya guardado (descripción/orden/fechas/crítico) sin subir una versión nueva
   * completa del cronograma. Solo ADMINISTRADOR DE RESIDENTES ([Authorize(Roles=...)] puro en
   * backend, mismo alcance que deleteMilestoneScheduleHistory).
   */
  editarHito(milestoneScheduleId: number, dto: MilestoneScheduleEditDTO): Observable<{ message: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${milestoneScheduleId}`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Hitos del catálogo que todavía no están en la versión vigente del cronograma del proyecto. */
  getFaltantes(projectId: number): Observable<MilestoneSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<MilestoneSimpleDTO[]>(`${this.apiUrl}/faltantes`, {
      params: { projectId },
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Agrega un único hito (de catálogo o personalizado) a una MilestoneScheduleHistory ya
   * guardada, sin subir una versión completa nueva. Devuelve el hito ya resuelto (mismo shape
   * que getByMilestoneScheduleHistoryId) para insertarlo en el Gantt en memoria sin un GET extra.
   */
  agregarHito(milestoneScheduleHistoryId: number, dto: MilestoneScheduleAddDTO): Observable<MilestoneScheduleGetDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<MilestoneScheduleGetDTO>(
      `${this.apiUrl}/${milestoneScheduleHistoryId}/hito`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
