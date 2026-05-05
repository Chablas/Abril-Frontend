import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LessonListDTO } from '../../features/projects/lecciones-aprendidas/dtos/lessonList.model';
import { LessonDetailDTO } from '../dtos/lesson/lessonDetail.model';
import { PhaseStageSubStageSubSpecialtyDTO } from "../dtos/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialty.model";
import { environment } from '../../../environments/environment';
import { DashboardDTO } from "../dtos/dashboard/DashboardDTO";
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson`;

  constructor(private http: HttpClient) {}

  getLessons(filters: any): Observable<LessonListDTO[]> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<LessonListDTO[]>(`${this.apiUrl}/all`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getById(id: number | null): Observable<LessonDetailDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<LessonDetailDTO>(`${this.apiUrl}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getFiltersCreate(): Observable<PhaseStageSubStageSubSpecialtyDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PhaseStageSubStageSubSpecialtyDTO[]>(`${this.apiUrl}/filters/create`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getByIdFetch(id: number | null): Promise<LessonDetailDTO> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.apiUrl}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = response.json();
    return datos;
  }
  createLesson(form: FormData) {
    const token = localStorage.getItem('access_token');
    return this.http.post(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteLesson(lessonId: number | undefined): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${lessonId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getDashboardData(ids: number[], filters: any): Observable<DashboardDTO> {
    const token = localStorage.getItem('access_token');

    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined && filters[key] !== 0) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.post<DashboardDTO>(`${this.apiUrl}/dashboard`, ids, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getExcel(filters: any): Observable<Blob> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/export-excel`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  }
  sendPDF(form: FormData) {
    const token = localStorage.getItem('access_token');
    return this.http.post(`${this.apiUrl}/send-pdf`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}