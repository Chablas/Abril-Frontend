import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvJefeSsomaInicioDto,
  EvJefeSsomaEvaluacionCreateDto,
  EvJefeSsomaCumplimientoDto,
  EvJefeSsomaResultadosDto,
  EvJefeSsomaPlanAccionDto,
  EvJefeSsomaPlanAccionCreateDto,
  EvJefeSsomaPlanAccionUpdateDto,
} from '../dtos/ev-jefe-ssoma.model';

@Injectable({ providedIn: 'root' })
export class EvJefeSsomaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/jefe-ssoma`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getInicio(): Observable<EvJefeSsomaInicioDto> {
    return this.http.get<EvJefeSsomaInicioDto>(`${this.base}/inicio`, { headers: this.headers() });
  }

  crear(dto: EvJefeSsomaEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  getPendientes(periodoId?: number | null): Observable<EvJefeSsomaCumplimientoDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    return this.http.get<EvJefeSsomaCumplimientoDto>(`${this.base}/pendientes`, { headers: this.headers(), params });
  }

  getResultados(periodoId?: number | null): Observable<EvJefeSsomaResultadosDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    return this.http.get<EvJefeSsomaResultadosDto>(`${this.base}/resultados`, { headers: this.headers(), params });
  }

  getPlanAccion(periodoId: number): Observable<EvJefeSsomaPlanAccionDto[]> {
    const params = new HttpParams().set('periodoId', periodoId.toString());
    return this.http.get<EvJefeSsomaPlanAccionDto[]>(`${this.base}/plan-accion`, { headers: this.headers(), params });
  }

  crearPlanAccion(periodoId: number, dto: EvJefeSsomaPlanAccionCreateDto): Observable<EvJefeSsomaPlanAccionDto> {
    const params = new HttpParams().set('periodoId', periodoId.toString());
    return this.http.post<EvJefeSsomaPlanAccionDto>(`${this.base}/plan-accion`, dto, { headers: this.headers(), params });
  }

  actualizarPlanAccion(id: number, dto: EvJefeSsomaPlanAccionUpdateDto): Observable<EvJefeSsomaPlanAccionDto> {
    return this.http.put<EvJefeSsomaPlanAccionDto>(`${this.base}/plan-accion/${id}`, dto, { headers: this.headers() });
  }

  eliminarPlanAccion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plan-accion/${id}`, { headers: this.headers() });
  }
}
