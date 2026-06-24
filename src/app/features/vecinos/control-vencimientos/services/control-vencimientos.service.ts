import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { VecinoLicenciaCreateDTO, VecinoLicenciaDTO } from '../dtos/control-vencimientos.dto';

@Injectable({ providedIn: 'root' })
export class ControlVencimientosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ControlVencimientos`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Listado de licencias/permisos. */
  getLicencias(): Observable<VecinoLicenciaDTO[]> {
    return this.http.get<VecinoLicenciaDTO[]>(this.apiUrl, { headers: this.authHeaders() });
  }

  /** Crea una licencia subiendo su archivo + fechas. */
  createLicencia(dto: VecinoLicenciaCreateDTO, file: File): Observable<{ licencia: VecinoLicenciaDTO; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fechaVencimiento', dto.fechaVencimiento);
    formData.append('fechaRecordatorio', dto.fechaRecordatorio);
    formData.append('diasAntes', dto.diasAntes.toString());
    return this.http.post<{ licencia: VecinoLicenciaDTO; message: string }>(this.apiUrl, formData, {
      headers: this.authHeaders(),
    });
  }
}
