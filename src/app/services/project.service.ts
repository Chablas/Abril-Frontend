import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectPagedDTO } from '../models/projectPaged.model';
import { ProjectCreateDTO } from "../models/projectCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPaged(page: number): Observable<ProjectPagedDTO> {
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createProject(dto: ProjectCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deleteProject(projectId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${projectId}`);
  }
}