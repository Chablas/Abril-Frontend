import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { IvtControlCreateDTO } from "../dtos/ivtControl/ivtControlCreate.model";

@Injectable({
  providedIn: 'root',
})
export class IvtControlService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ivtcontrolpdf`;

  constructor(private http: HttpClient) {}

  createIvtControl(dto: IvtControlCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
