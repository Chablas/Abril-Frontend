import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  RevisorSalidaInicialDTO,
  WorkerRevisoresUpdateDTO,
} from '../dtos/workerRevisorSalida.model';

@Injectable({ providedIn: 'root' })
export class RevisorSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/revisor-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: trabajadores con sus revisores + opciones + árbol de áreas (1 petición). */
  getInitialData(): Observable<RevisorSalidaInicialDTO> {
    return this.http.get<RevisorSalidaInicialDTO>(this.apiUrl, { headers: this.headers });
  }

  /** Reemplaza el conjunto completo de revisores del trabajador. */
  updateRevisores(workerId: number, dto: WorkerRevisoresUpdateDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${workerId}`, dto, {
      headers: this.headers,
    });
  }
}
