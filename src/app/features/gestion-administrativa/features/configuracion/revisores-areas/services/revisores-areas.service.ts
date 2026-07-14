import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { AreaRevisorInicialDTO, AreaRevisoresUpdateDTO } from '../dtos/areaRevisor.model';

@Injectable({ providedIn: 'root' })
export class RevisoresAreasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/revisores-areas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: áreas estándar con sus revisores + opciones del selector (1 petición). */
  getInitialData(): Observable<AreaRevisorInicialDTO> {
    return this.http.get<AreaRevisorInicialDTO>(this.apiUrl, { headers: this.headers });
  }

  /** Reemplaza el conjunto completo de revisores del área. */
  updateRevisores(areaScopeId: number, dto: AreaRevisoresUpdateDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }
}
