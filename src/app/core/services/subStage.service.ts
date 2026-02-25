import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubStagePagedDTO } from '../dtos/subStage/subStagePaged.model';
import { SubStageCreateDTO } from '../dtos/subStage/subStageCreate.model';
import { environment } from '../../../environments/environment';
import { SubStageEditDTO } from '../dtos/subStage/subStageEdit.model';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class SubStageService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/substage`;

  constructor(private http: HttpClient) {}

  getSubStagePaged(page: number): Observable<SubStagePagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<SubStagePagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createSubStage(dto: SubStageCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editSubStage(dto: SubStageEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteSubStage(subStageId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${subStageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
