import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
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
   * Vuelve a generar el PDF de una rendición observada y la reenvía en el acto a la primera
   * revisión (con los dos correos del paso). La rendición conserva su código y su número de
   * planilla.
   *
   * El archivo no vuelve: queda guardado y la planilla ya apunta al nuevo, así que se abre con el
   * botón «Planilla» de la fila. Lo único que responde es cómo salió el reenvío.
   */
  regenerarPlanilla(rendicionId: number): Observable<RegenerarPlanillaRespuesta> {
    return this.http.patch<RegenerarPlanillaRespuesta>(
      `${this.apiUrl}/${rendicionId}/regenerar-planilla`,
      {},
      { headers: this.headers },
    );
  }
}

/**
 * Cómo salió el reenvío a revisión que va pegado a «Volver a generar». Regenerar y enviar son dos
 * escrituras: si la segunda falla, el PDF nuevo igual quedó guardado y la planilla espera en
 * «Lista para enviar», así que el aviso tiene que poder decirlo.
 */
export interface RegenerarPlanillaRespuesta {
  message: string;
  /** false = se regeneró pero no salió a revisión: hay que enviarla a mano desde la tabla. */
  enviadaARevision: boolean;
}
