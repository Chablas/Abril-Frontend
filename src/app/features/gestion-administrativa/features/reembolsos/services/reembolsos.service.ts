import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import {
  PagarDto,
  ReembolsoDetalleDto,
  ReembolsoFilterDataDto,
  ReembolsoListResultDto,
} from '../dtos/reembolso.dto';

@Injectable({ providedIn: 'root' })
export class ReembolsosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/reembolsos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Planillas firmadas y pagadas + los números de las tarjetas, contados sobre ese mismo conjunto.
   * Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getAll(
    workerId: number | null = null,
    estadoReembolso: string | null = null,
    areaScopeIds: number[] | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<ReembolsoListResultDto> {
    let params = new HttpParams();
    if (workerId != null) params = params.set('workerId', workerId);
    if (estadoReembolso)  params = params.set('estadoReembolso', estadoReembolso);
    if (areaScopeIds)     for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    if (periodoAnio != null && periodoMes != null) {
      params = params.set('periodoAnio', periodoAnio).set('periodoMes', periodoMes);
    }
    return this.http.get<ReembolsoListResultDto>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<ReembolsoFilterDataDto> {
    return this.http.get<ReembolsoFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<ReembolsoDetalleDto> {
    return this.http.get<ReembolsoDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /** Marca como pagadas las salidas firmadas de lo seleccionado. */
  marcarPagadas(dto: PagarDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/pagar`, dto, {
      headers: this.headers,
    });
  }
}
