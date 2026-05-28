import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { LessonAreaConfigItemDto, ToggleLessonAreaResultDto } from '../dtos/lesson-area.dto';

@Injectable({ providedIn: 'root' })
export class LessonAreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/mejora-continua/lesson-areas`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(this.apiUrl, { headers: this.authHeaders() });
  }

  toggle(areaItemId: number): Observable<ToggleLessonAreaResultDto> {
    return this.http.put<ToggleLessonAreaResultDto>(
      `${this.apiUrl}/toggle/${areaItemId}`,
      {},
      { headers: this.authHeaders() },
    );
  }
}
