import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import {
  CorreccionS10Dto,
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
    estadoPrimeraRevision: string | null = null,
    estadoReembolso: string | null = null,
    conConsolidado: boolean | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<RendicionListResultDto> {
    let params = new HttpParams();
    if (estadoPrimeraRevision) params = params.set('estadoPrimeraRevision', estadoPrimeraRevision);
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

  /**
   * Envía la planilla a la primera revisión de la jefatura. Dispara los dos correos del paso: la
   * confirmación al propio solicitante y el aviso al jefe con los botones de aprobar y observar.
   */
  enviarPrimeraRevision(rendicionId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${rendicionId}/enviar-revision`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Vuelve a generar el PDF de una rendición observada y lo descarga. La rendición conserva su
   * código y su número de planilla, y queda lista para reenviar a revisión. Responde el archivo,
   * igual que rendir: por eso va como blob.
   */
  regenerarPlanilla(rendicionId: number): Observable<HttpResponse<Blob>> {
    return this.http.patch(
      `${this.apiUrl}/${rendicionId}/regenerar-planilla`,
      {},
      { headers: this.headers, responseType: 'blob', observe: 'response' },
    );
  }

  /**
   * Adjunta (o reemplaza) el Consolidado del S10 de la planilla. Cubre todas sus salidas, así que
   * `montoTotal` tiene que cuadrar con el monto de la planilla completa: el backend lo re-valida y
   * responde 400 si no coincide.
   */
  uploadConsolidadoS10(
    rendicionId: number, file: File, montoTotal: number, numeroGuia: string,
  ): Observable<ConsolidadoS10Dto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('montoTotal', String(montoTotal));
    formData.append('numeroGuia', numeroGuia);
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

  /**
   * Le pide al Coordinador ERP que corrija el Consolidado del S10 (RG-21). Es el camino
   * alternativo a recargarlo cuando el arreglo tiene que hacerse dentro del S10. El motivo es
   * obligatorio: sin el, el backend responde 400.
   */
  solicitarCorreccionS10(rendicionId: number, motivo: string): Observable<CorreccionS10Dto> {
    return this.http.post<CorreccionS10Dto>(
      `${this.apiUrl}/${rendicionId}/correccion-s10`,
      { motivo },
      { headers: this.headers },
    );
  }
}
