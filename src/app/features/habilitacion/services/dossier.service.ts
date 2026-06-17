import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';
import {
  DossierSemanaDto,
  DossierSemanaDetalleDto,
  DossierTipoDocumento,
} from '../dtos/dossier.model';

@Injectable({ providedIn: 'root' })
export class DossierService {
  private readonly base = `${HABILITACION_BASE}/dossier`;

  constructor(private http: HttpClient) {}

  getSemanas(proyectoId: number, empresaId?: number | null): Observable<DossierSemanaDto[]> {
    return this.http.get<DossierSemanaDto[]>(`${this.base}/semanas`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, ...(empresaId ? { empresaId } : {}) }),
    });
  }

  getSemanaDetalle(id: number): Observable<DossierSemanaDetalleDto> {
    return this.http.get<DossierSemanaDetalleDto>(`${this.base}/semanas/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  enviarDossier(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/semanas/${id}/enviar`, {}, {
      headers: buildHabHeaders(),
    });
  }

  revisarDossier(id: number, body: { estado: string; comentario?: string }): Observable<void> {
    return this.http.patch<void>(`${this.base}/semanas/${id}/revisar`, body, {
      headers: buildHabHeaders(),
    });
  }

  marcarSemanaNoAplica(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/semanas/${id}/no-aplica`, {}, {
      headers: buildHabHeaders(),
    });
  }

  subirDocumento(
    dossierSemanaId: number,
    tipoDocumento: DossierTipoDocumento,
    file: File,
  ): Observable<{ path: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('tipoDocumento', tipoDocumento);
    return this.http.post<{ path: string }>(
      `${this.base}/documentos/${dossierSemanaId}/subir`,
      form,
      { headers: buildHabHeaders() },
    );
  }

  marcarDocumentoNa(id: number, justificacion?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/documentos/${id}/no-aplica`,
      { justificacion: justificacion ?? null },
      { headers: buildHabHeaders() },
    );
  }
}
