import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../dtos/api/pagedResponse.model';
import { ResidentReportIncidenceDTO } from '../dtos/reportResponseControl/residentReportIncidence.model'; 
import { ResidentReportResponseCreateDto } from '../dtos/reportResponseControl/responseCreateDto.model';
import { UpdateIncidenceDTO } from '../dtos/reportResponseControl/updateIncidence.model';

@Injectable({
  providedIn: 'root',
})
export class ResidentReportIncidenceService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/residentReportIncidence`;

  constructor(private http: HttpClient) {}

  getReportsPaged(page: number): Observable<PagedResponseDTO<ResidentReportIncidenceDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<ResidentReportIncidenceDTO>>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createResidentReportIncidence(form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createResponse(form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/response`, form, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }

  updateIncidenceState(incidenceId: UpdateIncidenceDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}`, incidenceId, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}
