import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import { WorkerUpsertDto } from '../dtos/emo.model';

@Injectable({ providedIn: 'root' })
export class WorkerService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  createWorker(dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.post(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  updateWorker(id: number, dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  retirarWorker(id: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${id}/retirar`, {}, { headers: buildAuthHeaders() });
  }
}
