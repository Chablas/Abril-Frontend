import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CandidatoDecision,
  LongListDecisionResult,
  ReclutamientoFormDataDto,
  RevisionLongList,
  Seguimiento,
  SolicitantePanel,
  SolicitudPersonalCreateDto,
  SolicitudPersonalCreateResult,
} from '../dtos/solicitud-personal.dto';

@Injectable({ providedIn: 'root' })
export class SolicitudPersonalService {
  // API de dominio de reclutamiento (compartida): sirve los endpoints del solicitante.
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/reclutamiento`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getFormData(): Observable<ReclutamientoFormDataDto> {
    return this.http.get<ReclutamientoFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  /**
   * Panel del solicitante en una sola petición: tarjetas de "Gestión de candidatos" (long lists
   * que GTH le envió) + tabla "Mis solicitudes de vacante".
   */
  getPanel(): Observable<SolicitantePanel> {
    return this.http.get<SolicitantePanel>(`${this.apiUrl}/solicitante/panel`, {
      headers: this.headers,
    });
  }

  /** Revisión de la long list de un requerimiento (cabecera + candidatos con su CV). */
  getRevisionLongList(requerimientoId: number): Observable<RevisionLongList> {
    return this.http.get<RevisionLongList>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/long-list/revision`,
      { headers: this.headers },
    );
  }

  /**
   * Registra la decisión del solicitante sobre la long list (aprobar/rechazar por candidato).
   * El backend avanza el requerimiento y notifica a GTH por correo.
   */
  enviarDecisionLongList(
    requerimientoId: number,
    decisiones: CandidatoDecision[],
  ): Observable<LongListDecisionResult> {
    return this.http.post<LongListDecisionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/long-list/decision`,
      { decisiones },
      { headers: this.headers },
    );
  }

  /** Detalle de seguimiento de un requerimiento (cabecera + fases del pipeline). */
  getSeguimiento(requerimientoId: number): Observable<Seguimiento> {
    return this.http.get<Seguimiento>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/seguimiento`,
      { headers: this.headers },
    );
  }

  /**
   * Crea la solicitud (multipart): `data` = JSON del dto; `sustento` = adjunto opcional
   * (PDF/DOC/DOCX/XLS/XLSX).
   */
  create(
    dto: SolicitudPersonalCreateDto,
    sustento: File | null,
  ): Observable<SolicitudPersonalCreateResult> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));
    if (sustento) formData.append('sustento', sustento, sustento.name);
    return this.http.post<SolicitudPersonalCreateResult>(this.apiUrl, formData, {
      headers: this.headers,
    });
  }
}
