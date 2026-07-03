import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import {
  CharlaContratistaPendienteDto,
  CharlaContratistaUploadRequest,
  CharlaContratistaDto,
} from '../dtos/charla-contratista.dtos';

@Injectable({ providedIn: 'root' })
export class CharlaContratistaService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-charlas/contratista`;

  constructor(private http: HttpClient) {}

  getPendientes(fecha?: string): Observable<CharlaContratistaPendienteDto[]> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<CharlaContratistaPendienteDto[]>(`${this.base}/pendientes`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  getHistorial(page = 1, pageSize = 20): Observable<CharlaContratistaDto[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<CharlaContratistaDto[]>(`${this.base}/historial`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  subir(req: CharlaContratistaUploadRequest): Observable<CharlaContratistaDto> {
    return this.http.post<CharlaContratistaDto>(this.base, req, { headers: buildAuthHeaders() });
  }
}
