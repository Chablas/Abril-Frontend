import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { MilestoneProjectPagedDto } from '../dtos/milestone-project.dto';

@Injectable({
  providedIn: 'root',
})
export class MilestoneScheduleProjectsService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPagedWithResidents(
    page: number,
    search?: string,
    pageSize?: number,
  ): Observable<MilestoneProjectPagedDto> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams().set('page', String(page));
    if (pageSize) params = params.set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<MilestoneProjectPagedDto>(`${this.apiUrl}/paged-with-residents`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }

  uploadProjectFoto(projectId: number, file: File): Observable<{ message: string; fotoUrl: string }> {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('foto', file);
    return this.http.patch<{ message: string; fotoUrl: string }>(
      `${this.apiUrl}/${projectId}/foto`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Solo la característica de la tarjeta (p. ej. "5 pisos + 2 sótanos"); null la vacía. */
  updateLevelDescription(
    projectId: number,
    levelDescription: string | null,
  ): Observable<{ message: string; levelDescription: string | null }> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<{ message: string; levelDescription: string | null }>(
      `${this.apiUrl}/${projectId}/level-description`,
      { levelDescription },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
