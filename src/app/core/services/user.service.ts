import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreateDTO } from "../dtos/user/userCreate.model";
import { PagedResponseDTO } from "../dtos/api/pagedResponse.model";
import { UserDTO } from '../dtos/user/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/user`;

  constructor(private http: HttpClient) {}

  getUserPaged(page: number): Observable<PagedResponseDTO<UserDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<UserDTO>>(`${this.apiUrl}/paged?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  createUser(dto: UserCreateDTO): Observable<any> {
    const token = localStorage.getItem('access_token');
    return this.http.post(`${this.apiUrl}`, dto, { headers: { Authorization: `Bearer ${token}` } });
  }
}