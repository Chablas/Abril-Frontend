import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhasePagedDTO } from '../models/phase/phasePaged.model';
import { PhaseCreateDTO } from '../models/phase/phaseCreate.model';
import { environment } from '../../environments/environment';
import { PhaseEditDTO } from '../models/phase/phaseEdit.model';
import { ApiMessageDTO } from '../models/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class PhaseService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/phase`;

  constructor(private http: HttpClient) {}

  getPhasePaged(page: number): Observable<PhasePagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PhasePagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createPhase(dto: PhaseCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editPhase(dto: PhaseEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deletePhase(phaseId: number, updatedUserId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${phaseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
