import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { FIRMA_MFA_HEADER } from '../../../../../core/services/firma-mfa.service';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import { SolicitudSalidaDetalleDto } from '../../../shared/dtos/salida-detalle.dto';
import { ConsolidadoS10UploadResultDto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
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

  /** Headers de una firma: con la verificación de Microsoft si se consiguió (FirmaMfaService). */
  private conFirmaMfa(firmaMfa: string): Record<string, string> {
    return firmaMfa ? { ...this.headers, [FIRMA_MFA_HEADER]: firmaMfa } : this.headers;
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
   * El detalle de una salida de los consolidados del alcance, en consulta: trayectos, capturas con
   * sus montos y adjuntos. Es lo que abre el ojo de la tabla de salidas del detalle.
   */
  getSalidaDetalle(solicitudId: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/salidas/${solicitudId}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * Aprueba el reembolso, que ES firmarlo: estampa la firma en la planilla y en el Consolidado del
   * S10 y lo manda a la bandeja de Tesorería. Solo la jefatura de los trabajadores (403 si no).
   * Responde 409 si el usuario todavía no registró su firma; la pantalla usa ese código para abrir
   * el modal donde la dibuja. `firmaMfa` es la verificación de Microsoft (FirmaMfaService): sin
   * ella, o vencida, responde 403.
   */
  aprobarReembolso(accion: ConsolidadoAccionDto, firmaMfa: string): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/aprobar`, accion, {
      headers: this.conFirmaMfa(firmaMfa),
    });
  }

  /**
   * Observa el reembolso: vuelve al consolidador para que subsane. La observación es obligatoria —
   * es lo que él lee para saber qué corregir, y lo que se le manda al Coordinador ERP si la
   * corrección tiene que hacerse dentro del S10.
   */
  observarReembolso(accion: ConsolidadoAccionDto): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/observar`, accion, {
      headers: this.headers,
    });
  }

  /**
   * Vuelve a estampar la firma de quien ya firmó, mientras el consolidado siga esperando la del que
   * viene detrás. No agrega una segunda estampa: rehace las copias firmadas desde el original con
   * las mismas firmas y la suya al día. Responde 409 si ya no corresponde (no lo firmó, o el
   * siguiente ya firmó) y, como aprobar, si todavía no registró su firma. También pide `firmaMfa`.
   */
  volverAFirmar(accion: ConsolidadoAccionDto, firmaMfa: string): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/volver-a-firmar`, accion, {
      headers: this.conFirmaMfa(firmaMfa),
    });
  }

  /**
   * El consolidador le avisa a la jefatura que el consolidado tiene reembolsos esperando su visto
   * bueno. Se puede repetir. Responde 409 si no hay a quién escribirle.
   */
  notificarJefatura(consolidadoId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${consolidadoId}/notificar-jefatura`, {}, { headers: this.headers });
  }

  /**
   * El consolidador le pide al Coordinador ERP que corrija el registro del S10 de un consolidado
   * observado. El motivo es obligatorio: es lo que el ERP lee. Responde 409 si ya hay una corrección
   * en curso o si no hay ningún Coordinador ERP a quien avisarle.
   */
  solicitarCorreccionS10(consolidadoId: number, motivo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/${consolidadoId}/correccion-s10`, { motivo }, { headers: this.headers });
  }

  /**
   * El consolidador reemplaza el Consolidado del S10 —normalmente por una observación—. Es el único
   * lugar donde se reemplaza: Gestión de Rendiciones solo adjunta el primero. El documento nuevo
   * cubre las planillas que siguen con el reembolso abierto y, en el mismo paso, se le avisa a la
   * jefatura.
   */
  reemplazarConsolidado(
    consolidadoId: number, file: File, montoTotal: number, numeroReembolso: string,
  ): Observable<ConsolidadoS10UploadResultDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('montoTotal', String(montoTotal));
    formData.append('numeroReembolso', numeroReembolso);
    return this.http.post<ConsolidadoS10UploadResultDto>(
      `${this.apiUrl}/${consolidadoId}/reemplazar`, formData, { headers: this.headers });
  }

  /**
   * Qué correos saldrían con la acción, y a quién: la decisión de la jefatura sobre la selección, o
   * uno de los trámites del consolidador (`accion`). Se pide al apretar el botón —no al cargar la
   * pantalla— porque depende de qué está seleccionado, y lo resuelve el servidor para que la
   * confirmación no pueda desalinearse de Configuración → Correos.
   */
  correoPreview(request: ConsolidadoCorreoPreviewRequestDto): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/correo-preview`, request, {
      headers: this.headers,
    });
  }
}
