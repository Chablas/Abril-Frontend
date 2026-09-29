import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsolidadoS10UploadResultDto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { CorreoAvisoDto, CorreoPreviewRequestDto } from '../../../shared/correo-aviso';
import { ReembolsoBulkResultDto } from '../../../shared/dtos/rendicion-shared.dto';
import { SolicitudSalidaDetalleDto } from '../../../shared/dtos/salida-detalle.dto';
import {
  GestionRendicionDetalleDto,
  GestionRendicionFilterDataDto,
  GestionRendicionListResultDto,
  PlanillaGrupalDto,
  PrimeraRevisionAccionDto,
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
   * El detalle de una salida de las planillas del alcance, en consulta: trayectos, capturas con sus
   * montos y adjuntos. Es lo que abre el ojo de la tabla de salidas del detalle de la planilla.
   */
  getSalidaDetalle(solicitudId: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/salidas/${solicitudId}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * Prepara UNA planilla grupal para las planillas indicadas: el papel sin firmar con el que el
   * consolidador las registra en el S10. Ninguna puede tener ya una (no se rehace). Les avisa a sus
   * trabajadores por correo. Solo la prepara el consolidador; el backend responde 403/409 si algo
   * no cuadra.
   */
  prepararPlanillaGrupal(rendicionIds: number[]): Observable<PlanillaGrupalDto> {
    return this.http.post<PlanillaGrupalDto>(
      `${this.apiUrl}/planilla-grupal`, { rendicionIds }, { headers: this.headers },
    );
  }

  /**
   * Adjunta el PRIMER Consolidado del S10 de las planillas de UNA planilla grupal ya preparada: de
   * uno o de varios trabajadores, de las razones sociales que sean. Solo lo sube el consolidador.
   * Cubre todas sus salidas, así que `montoTotal` tiene que cuadrar con la suma de las planillas
   * completas: el backend lo re-valida (junto con el resto de las reglas) y responde 400/403/409 si
   * algo no cuadra.
   */
  uploadConsolidadoS10(
    rendicionIds: number[], file: File, montoTotal: number, numeroReembolso: string,
  ): Observable<ConsolidadoS10UploadResultDto> {
    const formData = new FormData();
    for (const id of rendicionIds) formData.append('rendicionIds', String(id));
    formData.append('file', file, file.name);
    formData.append('montoTotal', String(montoTotal));
    formData.append('numeroReembolso', numeroReembolso);
    return this.http.post<ConsolidadoS10UploadResultDto>(
      `${this.apiUrl}/consolidado-s10`,
      formData,
      { headers: this.headers },
    );
  }

  /**
   * Aprueba la primera revisión: habilita al consolidador a preparar la planilla grupal y le avisa
   * al trabajador por correo.
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

  /**
   * Qué correos saldrían al decidir la primera revisión de la selección, y a quién. Se pide al
   * apretar el botón —no al cargar la pantalla— porque depende de qué está seleccionado, y lo
   * resuelve el servidor para que la confirmación no pueda desalinearse de Configuración →
   * Correos.
   */
  correoPreview(request: CorreoPreviewRequestDto): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/correo-preview`, request, {
      headers: this.headers,
    });
  }
}
