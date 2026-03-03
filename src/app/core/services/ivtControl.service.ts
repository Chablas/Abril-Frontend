import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { IvtControlGetDTO } from "../dtos/ivtControl/ivtControlGet.model";
import { PagedResponseDTO } from "../dtos/api/pagedResponse.model";

@Injectable({
  providedIn: 'root',
})
export class IvtControlService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ivtcontrolpdf`;

  constructor(private http: HttpClient) {}

  createIvtControl(formData: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getIvtControlPaged(page: number): Observable<PagedResponseDTO<IvtControlGetDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<IvtControlGetDTO>>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
