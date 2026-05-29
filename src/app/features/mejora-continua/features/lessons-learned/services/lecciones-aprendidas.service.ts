import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { LessonListPagedDTO, LessonsPagedWithFiltersDTO } from '../dtos/lessonList.model';
import { LessonFiltersDTO } from '../dtos/lessonFilters.model';
import { ScopeItemDTO } from '../dtos/scope-item.model';
import { LessonAreaConfigItemDto } from '../../configuration/lesson-areas/dtos/lesson-area.dto';

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

  getFiltersCreate(lessonAreaId: number): Observable<ScopeItemDTO[]> {
    const params = new HttpParams().set('lessonAreaId', lessonAreaId);
    return this.http.get<ScopeItemDTO[]>(`${this.apiUrl}/filters/create`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Devuelve las ramas habilitadas con al menos un scope_item, para el dropdown de área al crear una lección. */
  getLessonAreasWithScope(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(
      `${environment.apiUrl}api/v1/mejora-continua/lesson-areas/with-scope`,
      { headers: this.authHeaders() },
    );
  }

  createLesson(form: FormData): Observable<unknown> {
    return this.http.post(this.apiUrl, form, {
      headers: this.authHeaders(),
    });
  }
}
