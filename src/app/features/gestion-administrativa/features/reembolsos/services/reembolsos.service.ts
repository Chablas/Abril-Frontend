import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import {
  ReembolsoDetalleDto,
  ReembolsoFilterDataDto,
  ReembolsoListResultDto,
  ReembolsoSeguimientoDto,
  ReembolsoSeleccionDto,
} from '../dtos/reembolso.dto';

/** Filtros que comparten la bandeja y el seguimiento. */
export interface ReembolsoQuery {
  workerId?: number | null;
  /** Búsqueda libre. Va al backend para que las tarjetas cuenten lo mismo que muestra la tabla. */
  q?: string | null;
  estadoReembolso?: string | null;
  areaScopeIds?: number[] | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ReembolsosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/reembolsos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  private params(q: ReembolsoQuery): HttpParams {
    let params = new HttpParams();
    if (q.workerId != null)  params = params.set('workerId', q.workerId);
    if (q.q?.trim())         params = params.set('q', q.q.trim());
    if (q.estadoReembolso)   params = params.set('estadoReembolso', q.estadoReembolso);
    if (q.areaScopeIds)      for (const id of q.areaScopeIds) params = params.append('areaScopeIds', id);
    if (q.periodoAnio != null && q.periodoMes != null) {
      params = params.set('periodoAnio', q.periodoAnio).set('periodoMes', q.periodoMes);
    }
    return params;
  }

  /**
   * Planillas firmadas, confirmadas y pagadas + los números de las tarjetas, contados sobre ese
   * mismo conjunto. Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getAll(q: ReembolsoQuery): Observable<ReembolsoListResultDto> {
    return this.http.get<ReembolsoListResultDto>(this.apiUrl, {
      headers: this.headers,
      params: this.params(q),
    });
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

  /** Seguimiento de pagos por colaborador. El estado no viaja: siempre mira lo pagado. */
  getSeguimiento(q: ReembolsoQuery): Observable<ReembolsoSeguimientoDto> {
    return this.http.get<ReembolsoSeguimientoDto>(`${this.apiUrl}/seguimiento`, {
      headers: this.headers,
      params: this.params({ ...q, estadoReembolso: null }),
    });
  }

  /** Paso 1: confirmar la revisión documental — habilita el pago (RG-26). */
  confirmarRevision(dto: ReembolsoSeleccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/confirmar-revision`, dto, {
      headers: this.headers,
    });
  }

  /** Paso 2: registrar el pago y cerrar el ciclo. */
  marcarPagadas(dto: ReembolsoSeleccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/pagar`, dto, {
      headers: this.headers,
    });
  }

  /**
   * A quién le llegaría el aviso de pago de lo seleccionado. Se pide al apretar el botón porque
   * depende de la selección, y lo resuelve el servidor sobre las salidas que de verdad se van a
   * pagar. Confirmar la revisión no tiene preview: ese paso no manda ningún correo.
   */
  correoPreviewPago(dto: ReembolsoSeleccionDto): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/pagar/correo-preview`, dto, {
      headers: this.headers,
    });
  }
}
