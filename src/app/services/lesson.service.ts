import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LessonListDTO, LessonListPagedDTO } from '../models/lesson.model';
import { LessonDetailDTO } from '../models/lessonDetail.model';
import { LessonFiltersDTO } from "../models/lessonFilters.model";
import { PhaseStageSubStageSubSpecialtyDTO } from "../models/phaseStageSubStageSubSpecialty.model";
import { environment } from '../../environments/environment';
import { DashboardDTO } from "../models/dashboard/DashboardDTO";

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson`;

  constructor(private http: HttpClient) {}

  getLessons(filters: any): Observable<LessonListDTO[]> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<LessonListDTO[]>(`${this.apiUrl}/all`, { params });
  }

  getById(id: number | null): Observable<LessonDetailDTO> {
    return this.http.get<LessonDetailDTO>(`${this.apiUrl}/${id}`);
  }

  getFiltersInitialLoad(): Observable<LessonFiltersDTO> {
    return this.http.get<LessonFiltersDTO>(`${this.apiUrl}/filters/initialLoad`);
  }

  getFiltersCreate(): Observable<PhaseStageSubStageSubSpecialtyDTO[]> {
    return this.http.get<PhaseStageSubStageSubSpecialtyDTO[]>(`${this.apiUrl}/filters/create`);
  }

  getLessonsUsingFilters(filters: any) {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<LessonListPagedDTO>(this.apiUrl, { params });
  }

  async getByIdFetch(id: number | null): Promise<LessonDetailDTO> {
    const response = await fetch(`${this.apiUrl}/${id}`);
    const datos = response.json();
    return datos;
  }
  createLesson(form: FormData) {
    const token = localStorage.getItem('access_token');
    return this.http.post(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getDashboardData(ids: number[]): Observable<DashboardDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<DashboardDTO>(`${this.apiUrl}/dashboard`, ids, {
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
}