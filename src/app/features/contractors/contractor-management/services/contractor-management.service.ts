import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { ContractorManagementDTO } from '../dtos/contractor-management.dto';

@Injectable({
  providedIn: 'root',
})
export class ContractorManagementService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ContractorManagement`;

  constructor(private http: HttpClient) {}

  getPaged(page: number): Observable<PagedResponseDTO<ContractorManagementDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<ContractorManagementDTO>>(
      `${this.apiUrl}?page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  approve(companyId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${companyId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  reject(companyId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${companyId}/reject`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
