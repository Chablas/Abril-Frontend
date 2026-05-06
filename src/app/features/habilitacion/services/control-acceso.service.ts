import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

export interface EntregableResumenDto {
  nombre: string;
  estado: string;
  vigencia: string | null;
}

export interface ConsultaResultDto {
  workerId: number;
  apellidoNombre: string;
  nombre: string;
  empresa: string;
  dni: string;
  estadoHabilitacion: string;
  documentosFaltantes: string[] | null;
  documentosPorVencer: { nombre: string; vigencia: string }[] | null;
  sctrEstado: string | null;
  sctrVigencia: string | null;
  entregables: EntregableResumenDto[] | null;
}

export interface InduccionHoyDto {
  induccionId: number;
  apellidoNombre: string;
  dni: string;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  estado: string;
  ingresoConfirmado: boolean;
}

export interface NoAutorizadoDto {
  workerId: number;
  nombre: string;
  empresa: string;
  documentosFaltantes: string[];
}

export interface TareoPartidaDto {
  id?: number;
  nombre: string;
  tipo: 'CASA' | 'CONTRATISTA';
  cantidad: number;
  horas: number;
}

export interface TareoDto {
  id?: number;
  proyectoId: number;
  fecha: string;
  partidas: TareoPartidaDto[];
}

@Injectable({ providedIn: 'root' })
export class ControlAccesoService {
  private readonly base = `${HABILITACION_BASE}/control-acceso`;

  constructor(private http: HttpClient) {}

  consultar(proyectoId: number, query: string): Observable<ConsultaResultDto[]> {
    return this.http.get<ConsultaResultDto[]>(`${this.base}/consulta`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, search: query }),
    });
  }

  getInducciones(): Observable<InduccionHoyDto[]> {
    return this.http.get<InduccionHoyDto[]>(`${this.base}/inducciones-hoy`, {
      headers: buildHabHeaders(),
    });
  }

  confirmarIngreso(id: number): Observable<InduccionHoyDto> {
    return this.http.post<InduccionHoyDto>(
      `${this.base}/inducciones/${id}/confirmar-ingreso`,
      {},
      { headers: buildHabHeaders() },
    );
  }

  getNoAutorizados(proyectoId: number): Observable<NoAutorizadoDto[]> {
    return this.http.get<NoAutorizadoDto[]>(`${this.base}/no-autorizados`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId }),
    });
  }

  getTareo(proyectoId: number, fecha: string): Observable<TareoDto> {
    return this.http.get<TareoDto>(`${this.base}/tareo`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, fecha }),
    });
  }

  saveTareo(body: TareoDto): Observable<TareoDto> {
    return this.http.post<TareoDto>(`${this.base}/tareo`, body, {
      headers: buildHabHeaders(),
    });
  }
}
