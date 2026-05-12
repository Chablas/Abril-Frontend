import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { SolicitudSalidaFormDataDto } from '../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto } from '../dtos/solicitud-salida-create.dto';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';

@Injectable({ providedIn: 'root' })
export class SolicitudSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getMySolicitudes(): Observable<SolicitudSalidaListItemDto[]> {
    return this.http.get<SolicitudSalidaListItemDto[]>(this.apiUrl, { headers: this.headers });
  }

  getFormData(): Observable<SolicitudSalidaFormDataDto> {
    return this.http.get<SolicitudSalidaFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  create(dto: SolicitudSalidaCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.apiUrl, dto, {
      headers: this.headers,
    });
  }
}
