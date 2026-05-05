import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LessonFiltersDTO } from '../../lecciones-aprendidas/dtos/lessonFilters.model';

@Injectable({
  providedIn: 'root',
})
export class LessonsDashboardService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lessons-dashboard`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getFilters(): Observable<LessonFiltersDTO> {
    return this.http.get<LessonFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: this.authHeaders(),
    });
  }
}
