import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import {
  ConsolidadoAccionDto,
  ConsolidadoCorreoPreviewRequestDto,
  ConsolidadoDetalleDto,
  ConsolidadoFilterDataDto,
  ConsolidadoListResultDto,
} from '../dtos/consolidado.dto';

@Injectable({ providedIn: 'root' })
export class ConsolidadosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/consolidados`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Consolidados del alcance del usuario + los números de las tarjetas, contados sobre ese mismo
   * conjunto. Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getAll(
    workerId: number | null = null,
    estadoReembolso: string | null = null,
    texto: string | null = null,
    areaScopeIds: number[] | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<ConsolidadoListResultDto> {
    let params = new HttpParams();
    if (workerId != null)     params = params.set('workerId', workerId);
    if (estadoReembolso)      params = params.set('estadoReembolso', estadoReembolso);
    if (texto?.trim())        params = params.set('texto', texto.trim());
    if (areaScopeIds)         for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    if (periodoAnio != null && periodoMes != null) {
      params = params.set('periodoAnio', periodoAnio).set('periodoMes', periodoMes);
    }
    return this.http.get<ConsolidadoListResultDto>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<ConsolidadoFilterDataDto> {
    return this.http.get<ConsolidadoFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<ConsolidadoDetalleDto> {
    return this.http.get<ConsolidadoDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * Aprueba el reembolso, que ES firmarlo: estampa la firma en la planilla y en el Consolidado del
   * S10 y lo manda a la bandeja de Tesorería. Responde 409 si el usuario todavía no registró su
   * firma; la pantalla usa ese código para abrir el modal donde la dibuja.
   */
  aprobarReembolso(accion: ConsolidadoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/aprobar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Observa el reembolso: vuelve al trabajador para que subsane. La observación es obligatoria —
   * es lo que él lee para saber qué corregir, y lo que se le manda al Coordinador ERP si la
   * corrección tiene que hacerse dentro del S10.
   */
  observarReembolso(accion: ConsolidadoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/observar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Qué correos saldrían al decidir el reembolso de la selección, y a quién. Se pide al apretar el
   * botón —no al cargar la pantalla— porque depende de qué está seleccionado, y lo resuelve el
   * servidor para que la confirmación no pueda desalinearse de Configuración → Correos.
   */
  correoPreview(request: ConsolidadoCorreoPreviewRequestDto): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/correo-preview`, request, {
      headers: this.headers,
    });
  }
}
