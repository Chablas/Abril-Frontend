import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvEvaluacionStaffPendienteDto,
  EvEvaluacionStaffCriterioDto,
  EvEvaluacionStaffCreateDto,
  EvEvaluacionStaffResultadoDto,
} from '../dtos/ev-evaluacion-staff.model';

@Injectable({ providedIn: 'root' })
export class EvEvaluacionStaffService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/staff`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getPendientes(): Observable<EvEvaluacionStaffPendienteDto[]> {
    return this.http.get<EvEvaluacionStaffPendienteDto[]>(`${this.base}/pendientes`, { headers: this.headers() });
  }

  getPlantilla(puestoId: number): Observable<EvEvaluacionStaffCriterioDto[]> {
    return this.http.get<EvEvaluacionStaffCriterioDto[]>(`${this.base}/plantilla/${puestoId}`, { headers: this.headers() });
  }

  crear(dto: EvEvaluacionStaffCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  getResultados(periodoId?: number | null): Observable<EvEvaluacionStaffResultadoDto[]> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    return this.http.get<EvEvaluacionStaffResultadoDto[]>(`${this.base}/resultados`, { headers: this.headers(), params });
  }
}
