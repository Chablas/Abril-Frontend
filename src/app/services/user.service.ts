import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreateDTO } from "../models/userCreate.model";
import { PagedResponseDTO } from "../models/pagedResponse.model";
import { UserDTO } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/user`;

  constructor(private http: HttpClient) {}

  getUserPaged(page: number): Observable<PagedResponseDTO<UserDTO>> {
    return this.http.get<PagedResponseDTO<UserDTO>>(`${this.apiUrl}/paged?page=${page}`);
  }
  createUser(dto: UserCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
}