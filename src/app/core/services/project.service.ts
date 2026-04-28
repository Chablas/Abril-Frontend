import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectPagedDTO } from '../dtos/project/projectPaged.model';
import { ProjectCreateDTO } from "../dtos/project/projectCreate.model";
import { ProjectEditDTO } from "../dtos/project/projectEdit.model";
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from "../dtos/api/ApiMessage.model";
import { ProjectScheduleSimpleDTO } from '../dtos/project/projectScheduleSimple.model';
import { ProjectEmailsDTO } from '../dtos/project/projectEmails.model';
import { ProjectQueryParams } from '../dtos/project/projectQuery.model';

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
  getProjectsPaged(query: ProjectQueryParams = {}): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }
  getProjectPagedWithResidents(page: number): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged-with-residents?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  
  getWithResidentByUserId(): Observable<ProjectScheduleSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectScheduleSimpleDTO[]>(`${this.apiUrl}/with-resident-by-userId`, {
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
  deleteProject(projectId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getProjectEmails(projectId: number): Observable<ProjectEmailsDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectEmailsDTO>(`${this.apiUrl}/${projectId}/emails`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  patchProjectEmails(projectId: number, dto: ProjectEmailsDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectId}/emails`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}