import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { CorreoAvisoDto, CorreoPreviewRequestDto } from '../../../shared/correo-aviso';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import {
  GestionRendicionDetalleDto,
  GestionRendicionFilterDataDto,
  GestionRendicionListResultDto,
  PrimeraRevisionAccionDto,
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
    estadoPrimeraRevision: string | null = null,
    estadoReembolso: string | null = null,
    conConsolidado: boolean | null = null,
    areaScopeIds: number[] | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<GestionRendicionListResultDto> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (estadoPrimeraRevision)   params = params.set('estadoPrimeraRevision', estadoPrimeraRevision);
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

  /**
   * Aprueba la primera revisión: habilita al trabajador a cargar el Consolidado del S10 y le avisa
   * por correo.
   */
  aprobarPrimeraRevision(accion: PrimeraRevisionAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(
      `${this.apiUrl}/primera-revision/aprobar`, accion, { headers: this.headers },
    );
  }

  /**
   * Observa la primera revisión. El comentario es obligatorio: es lo que el trabajador lee para
   * saber qué corregir antes de volver a generar la rendición.
   */
  observarPrimeraRevision(accion: PrimeraRevisionAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(
      `${this.apiUrl}/primera-revision/observar`, accion, { headers: this.headers },
    );
  }

  aprobarReembolso(accion: ReembolsoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/aprobar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Observa el reembolso: la planilla vuelve al trabajador para que subsane. La observación es
   * obligatoria — es lo que él lee para saber qué corregir, y lo que se le manda al Coordinador ERP
   * si la corrección tiene que hacerse dentro del S10.
   */
  observarReembolso(accion: ReembolsoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/observar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Qué correos saldrían al tomar una de las cuatro decisiones sobre la selección, y a quién. Se
   * pide al apretar el botón —no al cargar la pantalla— porque depende de qué está seleccionado, y
   * lo resuelve el servidor para que la confirmación no pueda desalinearse de Configuración →
   * Correos.
   */
  correoPreview(request: CorreoPreviewRequestDto): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/correo-preview`, request, {
      headers: this.headers,
    });
  }
}
