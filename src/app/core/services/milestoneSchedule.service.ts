import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MilestoneScheduleGetDTO } from "../dtos/milestoneSchedule/milestoneSchedule.model";
import { MilestoneScheduleFakeDataDTO } from '../dtos/milestoneSchedule/milestoneScheduleFakeData.model';
import { MilestoneScheduleCreateDTO } from '../dtos/milestoneSchedule/milestoneScheduleCreate.model';

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
  editarHito(milestoneScheduleId: number, dto: MilestoneScheduleCreateDTO): Observable<{ message: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${milestoneScheduleId}`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
