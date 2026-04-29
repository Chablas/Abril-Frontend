import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmpresaEntregableDto,
  EmpresaEntregableUpdateDto,
  EmpresaProyectoDto,
} from '../dtos/empresa.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class HabEmpresaService {
  private readonly base = `${HABILITACION_BASE}/empresas`;

  constructor(private http: HttpClient) {}

  getEntregables(
    empresaId: number,
    proyectoId: number,
    mes?: number,
    anio?: number,
  ): Observable<EmpresaEntregableDto[]> {
    return this.http.get<EmpresaEntregableDto[]>(
      `${this.base}/${empresaId}/entregables`,
      {
        headers: buildHabHeaders(),
        params: buildHabParams({ proyectoId, mes, anio }),
      },
    );
  }

  updateEntregable(
    empresaId: number,
    itemId: number,
    dto: EmpresaEntregableUpdateDto,
  ): Observable<EmpresaEntregableDto> {
    return this.http.put<EmpresaEntregableDto>(
      `${this.base}/${empresaId}/entregables/${itemId}`,
      dto,
      { headers: buildHabHeaders() },
    );
  }

  getProyectos(empresaId: number): Observable<EmpresaProyectoDto[]> {
    return this.http.get<EmpresaProyectoDto[]>(`${this.base}/${empresaId}/proyectos`, {
      headers: buildHabHeaders(),
    });
  }
}
