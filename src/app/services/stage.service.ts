import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StagePagedDTO } from '../models/stage/stagePaged.model';
import { StageCreateDTO } from '../models/stage/stageCreate.model';
import { environment } from '../../environments/environment';
import { StageEditDTO } from '../models/stage/stageEdit.model';
import { ApiMessageDTO } from '../models/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class StageService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/stage`;

  constructor(private http: HttpClient) {}

  getStagePaged(page: number): Observable<StagePagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<StagePagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createStage(dto: StageCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editStage(dto: StageEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteStage(stageId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
