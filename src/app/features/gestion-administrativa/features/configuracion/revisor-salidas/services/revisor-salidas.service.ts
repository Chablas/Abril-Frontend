import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  WorkerRevisorSalidaItemDTO,
  WorkerRevisorSalidaOptionDTO,
  WorkerRevisorSalidaUpdateDTO,
} from '../dtos/workerRevisorSalida.model';

@Injectable({ providedIn: 'root' })
export class RevisorSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/revisor-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getRevisores(): Observable<WorkerRevisorSalidaItemDTO[]> {
    return this.http.get<WorkerRevisorSalidaItemDTO[]>(this.apiUrl, { headers: this.headers });
  }

  getOptions(): Observable<WorkerRevisorSalidaOptionDTO[]> {
    return this.http.get<WorkerRevisorSalidaOptionDTO[]>(`${this.apiUrl}/options`, {
      headers: this.headers,
    });
  }

  updateRevisor(
    workerId: number,
    dto: WorkerRevisorSalidaUpdateDTO,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${workerId}`, dto, {
      headers: this.headers,
    });
  }
}
