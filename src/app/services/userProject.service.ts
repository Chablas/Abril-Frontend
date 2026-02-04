import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProjectPagedDTO } from '../models/userProject/userProjectPaged.model';
import { UserProjectCreateDTO } from "../models/userProject/userProjectCreate.model";
import { environment } from '../../environments/environment';
import { UserProjectCreateDataDTO } from "../models/userProject/userProjectCreateData.model";
import { ApiMessageDTO } from "../models/api/ApiMessage.model";

@Injectable({
  providedIn: 'root'
})
export class UserProjectService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/userProject`;

  constructor(private http: HttpClient) {}

  getUserProjectPaged(page: number): Observable<UserProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<UserProjectPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {headers: {Authorization: `Bearer ${token}`}});
  }
  getUserProjectCreateData(): Observable<UserProjectCreateDataDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<UserProjectCreateDataDTO>(`${this.apiUrl}/data-create`, {headers: {Authorization: `Bearer ${token}`}});
  }
  createUserProject(dto: UserProjectCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {headers: {Authorization: `Bearer ${token}`}});
  }
  deleteUserProject(userProjectId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${userProjectId}`, {headers: {Authorization: `Bearer ${token}`}});
  }
}