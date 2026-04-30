import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import {
  DocumentoVersionDto,
  WorkerDetalleDto,
  WorkerEditDto,
  WorkerEntregableDto,
  WorkerEntregableUpdateDto,
  WorkerHabilitacionListDto,
} from '../dtos/trabajador.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class TrabajadorHabService {
  private readonly base = `${HABILITACION_BASE}/trabajadores`;

  constructor(private http: HttpClient) {}

  getTrabajadores(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<WorkerHabilitacionListDto>> {
    return this.http.get<PagedResponseDTO<WorkerHabilitacionListDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getWorker(workerId: number): Observable<WorkerDetalleDto> {
    return this.http.get<WorkerDetalleDto>(`${this.base}/${workerId}`, {
      headers: buildHabHeaders(),
    });
  }

  updateWorker(workerId: number, dto: WorkerEditDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${workerId}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getEntregables(workerId: number): Observable<WorkerEntregableDto[]> {
    return this.http.get<WorkerEntregableDto[]>(`${this.base}/${workerId}/entregables`, {
      headers: buildHabHeaders(),
    });
  }

  updateEntregable(
    id: number,
    dto: WorkerEntregableUpdateDto,
  ): Observable<WorkerEntregableDto> {
    return this.http.put<WorkerEntregableDto>(`${this.base}/entregables/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getVersiones(id: number): Observable<DocumentoVersionDto[]> {
    return this.http.get<DocumentoVersionDto[]>(
      `${this.base}/entregables/${id}/versiones`,
      { headers: buildHabHeaders() },
    );
  }

  cambiarObra(workerId: number, dto: any): Observable<void> {
    return this.http.patch<void>(`${this.base}/${workerId}/cambiar-obra`, dto, {
      headers: buildHabHeaders(),
    });
  }

  reingreso(workerId: number, proyectoId: number, empresaId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${workerId}/reingreso`,
      { proyectoId, empresaId },
      { headers: buildHabHeaders() },
    );
  }
}
