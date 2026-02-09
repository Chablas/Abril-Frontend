import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectPagedDTO } from '../models/project/projectPaged.model';
import { ProjectCreateDTO } from "../models/project/projectCreate.model";
import { ProjectEditDTO } from "../models/project/projectEdit.model";
import { environment } from '../../environments/environment';
import { ApiMessageDTO } from "../models/api/ApiMessage.model";

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPaged(page: number): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createProject(dto: ProjectCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editProject(dto: ProjectEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteProject(projectId: number, updatedUserId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}