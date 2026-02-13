import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AreaPagedDTO } from '../models/area/areaPaged.model';
import { AreaCreateDTO } from '../models/area/areaCreate.model';
import { AreaEditDTO } from '../models/area/areaEdit.model';
import { environment } from '../../environments/environment';
import { ApiMessageDTO } from '../models/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class AreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/area`;

  constructor(private http: HttpClient) {}

  getAreaPaged(page: number): Observable<AreaPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<AreaPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createArea(dto: AreaCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editArea(dto: AreaEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteArea(areaId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${areaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
