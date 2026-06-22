import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AccidenteIncidenteListItemDto,
  AccidenteIncidenteDetalleDto,
  CrearAccidenteIncidenteRequest,
  ActualizarAccidenteIncidenteRequest,
  SubirDocumentoRequest,
  DocumentoAdjuntoDto,
} from './accidente-incidente.dtos';

@Injectable({ providedIn: 'root' })
export class AccidenteIncidenteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes`;

  getList(params: {
    proyectoId?: number;
    tipo?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: AccidenteIncidenteListItemDto[]; total: number; page: number; pageSize: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipo) p = p.set('tipo', params.tipo);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<{ items: AccidenteIncidenteListItemDto[]; total: number; page: number; pageSize: number }>(
      this.base,
      { params: p },
    );
  }

  getDetalle(id: number): Observable<AccidenteIncidenteDetalleDto> {
    return this.http.get<AccidenteIncidenteDetalleDto>(`${this.base}/${id}`);
  }

  crear(request: CrearAccidenteIncidenteRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request);
  }

  actualizar(id: number, request: ActualizarAccidenteIncidenteRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, request);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  subirDocumento(accidenteId: number, request: SubirDocumentoRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/${accidenteId}/documentos`, request);
  }

  getDocumento(accidenteId: number, docId: number): Observable<DocumentoAdjuntoDto> {
    return this.http.get<DocumentoAdjuntoDto>(`${this.base}/${accidenteId}/documentos/${docId}`);
  }
}
