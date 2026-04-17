import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectPagedDTO } from '../dtos/project/projectPaged.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPagedWithResidents(page: number): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged-with-residents?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
