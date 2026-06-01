import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardDTO } from '../dtos/dashboard/DashboardDTO';

/**
 * Servicio legacy del dashboard de lecciones aprendidas. Solo cubre los endpoints
 * que viven en Controllers/LessonController.cs (dashboard agregado + envío de PDF).
 *
 * Los endpoints específicos de la página /mejora-continua/lessons-learned
 * (getById, deleteLesson, getExcel) se migraron a
 * features/mejora-continua/features/lessons-learned/services/lecciones-aprendidas.service.ts
 * siguiendo la convención de vertical-slice features.
 */
@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getDashboardData(ids: number[], filters: any): Observable<DashboardDTO> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        filters[key] !== '' &&
        filters[key] !== undefined &&
        filters[key] !== 0
      ) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.post<DashboardDTO>(`${this.apiUrl}/dashboard`, ids, {
      params,
      headers: this.authHeaders(),
    });
  }

  sendPDF(form: FormData) {
    return this.http.post(`${this.apiUrl}/send-pdf`, form, {
      headers: this.authHeaders(),
    });
  }
}
