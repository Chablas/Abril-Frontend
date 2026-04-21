import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ProjectSubContractorFormDataDTO } from '../dtos/projectSubContractorFormDataDTO.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ProjectSubContractorDTO } from '../dtos/projectSubContractorDto.model';

@Injectable({
  providedIn: 'root',
})
export class AdjudicacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectSubContractor`;

  constructor(private http: HttpClient) {}

  getFormData(): Observable<ProjectSubContractorFormDataDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectSubContractorFormDataDTO>(`${this.apiUrl}/form-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createAdjudicacion(form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getAdjudicacionPaged(filters: any): Observable<PagedResponseDTO<ProjectSubContractorDTO>> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined && filters[key] !== 0) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<PagedResponseDTO<ProjectSubContractorDTO>>(`${this.apiUrl}/paged`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  sendNotification(dto: { projectSubContractorId: number; graphAccessToken: string }): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/send-notification`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  updateStatus(projectSubContractorId: number, projectSubContractorStatusId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}/status`, { projectSubContractorStatusId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  saveDates(projectSubContractorId: number, dto: { signingDate: string; startDate: string; endDate: string }): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}/dates`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  generateDocument(
    projectSubContractorId: number,
    documentType: string,
  ): Observable<{ fileUrl: string; originalFileName: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.post<{ fileUrl: string; originalFileName: string }>(
      `${this.apiUrl}/${projectSubContractorId}/generate/${documentType}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  updateDocumentStatus(
    projectSubContractorId: number,
    documentType: string,
    dto: { statusId: number | null; observation: string | null },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/documents/${documentType}/status`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  uploadDocument(
    projectSubContractorId: number,
    documentType: string,
    file: File,
  ): Observable<{ fileUrl: string; originalFileName: string }> {
    const token = localStorage.getItem('access_token');
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fileUrl: string; originalFileName: string }>(
      `${this.apiUrl}/${projectSubContractorId}/documents/${documentType}`,
      form,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
