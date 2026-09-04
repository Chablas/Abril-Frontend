import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  RendicionDetalleDto,
  RendicionFilterDataDto,
  RendicionListResultDto,
} from '../dtos/rendicion.dto';

@Injectable({ providedIn: 'root' })
export class RendicionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/rendiciones`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Planillas propias filtradas + los números de las tarjetas, contados sobre ese mismo conjunto.
   * Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getMisRendiciones(
    estadoReembolso: string | null = null,
    conConsolidado: boolean | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<RendicionListResultDto> {
    let params = new HttpParams();
    if (estadoReembolso) params = params.set('estadoReembolso', estadoReembolso);
    if (conConsolidado != null) params = params.set('conConsolidado', conConsolidado);
    if (periodoAnio != null && periodoMes != null) {
      params = params.set('periodoAnio', periodoAnio).set('periodoMes', periodoMes);
    }
    return this.http.get<RendicionListResultDto>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<RendicionFilterDataDto> {
    return this.http.get<RendicionFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<RendicionDetalleDto> {
    return this.http.get<RendicionDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /** Adjunta (o reemplaza) el Consolidado del S10 de la planilla. Cubre todas sus salidas. */
  uploadConsolidadoS10(rendicionId: number, file: File): Observable<ConsolidadoS10Dto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ConsolidadoS10Dto>(
      `${this.apiUrl}/${rendicionId}/consolidado-s10`,
      formData,
      { headers: this.headers },
    );
  }

  /** Avisa al jefe/revisor que la planilla ya tiene su Consolidado del S10. */
  notificarRevisor(rendicionId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${rendicionId}/notificar-revisor`,
      {},
      { headers: this.headers },
    );
  }
}
