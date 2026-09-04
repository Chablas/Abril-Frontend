import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import {
  GestionRendicionDetalleDto,
  GestionRendicionFilterDataDto,
  GestionRendicionListResultDto,
  ReembolsoAccionDto,
} from '../dtos/gestion-rendicion.dto';

@Injectable({ providedIn: 'root' })
export class GestionRendicionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/gestion-rendiciones`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Planillas del alcance del revisor + los números de las tarjetas, contados sobre ese mismo
   * conjunto. Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getAll(
    workerId: number | null = null,
    estadoReembolso: string | null = null,
    conConsolidado: boolean | null = null,
    areaScopeIds: number[] | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<GestionRendicionListResultDto> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (estadoReembolso)         params = params.set('estadoReembolso', estadoReembolso);
    if (conConsolidado != null)  params = params.set('conConsolidado', conConsolidado);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    if (periodoAnio != null && periodoMes != null) {
      params = params.set('periodoAnio', periodoAnio).set('periodoMes', periodoMes);
    }
    return this.http.get<GestionRendicionListResultDto>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<GestionRendicionFilterDataDto> {
    return this.http.get<GestionRendicionFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<GestionRendicionDetalleDto> {
    return this.http.get<GestionRendicionDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
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

  aprobarReembolso(accion: ReembolsoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/aprobar`, accion, {
      headers: this.headers,
    });
  }

  /** La observación es obligatoria: es lo que el trabajador subsana. */
  rechazarReembolso(accion: ReembolsoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/rechazar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Firma las planillas de lo seleccionado. Responde 409 cuando el usuario todavía no registró su
   * firma: la pantalla usa ese código para abrir el modal donde la dibuja y reintentar, en vez de
   * mandarlo a Configuración.
   */
  firmar(accion: ReembolsoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/firmar`, accion, {
      headers: this.headers,
    });
  }
}
