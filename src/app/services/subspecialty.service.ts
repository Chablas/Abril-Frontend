import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubSpecialtyPagedDTO } from '../models/subSpecialty/subSpecialtyPaged.model';
import { SubSpecialtyCreateDTO } from '../models/subSpecialty/subSpecialtyCreate.model';
import { environment } from '../../environments/environment';
import { SubSpecialtyEditDTO } from '../models/subSpecialty/subSpecialtyEdit.model';
import { ApiMessageDTO } from '../models/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class SubSpecialtyService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/subspecialty`;

  constructor(private http: HttpClient) {}

  getSubSpecialtyPaged(page: number): Observable<SubSpecialtyPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<SubSpecialtyPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createSubSpecialty(dto: SubSpecialtyCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editSubSpecialty(dto: SubSpecialtyEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteSubSpecialty(subSpecialtyId: number, updatedUserId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${subSpecialtyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
