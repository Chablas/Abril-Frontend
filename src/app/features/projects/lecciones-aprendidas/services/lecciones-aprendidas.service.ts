import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LessonListPagedDTO, LessonsPagedWithFiltersDTO } from '../dtos/lessonList.model';
import { LessonFiltersDTO } from '../dtos/lessonFilters.model';

@Injectable({
  providedIn: 'root',
})
export class LeccionesAprendidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getLessonsUsingFilters(filters: any): Observable<LessonListPagedDTO> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<LessonListPagedDTO>(this.apiUrl, {
      params,
      headers: this.authHeaders(),
    });
  }

  getLessonsPagedWithFilters(filters: any): Observable<LessonsPagedWithFiltersDTO> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<LessonsPagedWithFiltersDTO>(`${this.apiUrl}/paged-with-filters`, {
      params,
      headers: this.authHeaders(),
    });
  }
}
