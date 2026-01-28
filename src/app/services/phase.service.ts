import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhasePagedDTO } from '../models/phasePaged.model';
import { PhaseCreateDTO } from "../models/phaseCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhaseService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/phase`;

  constructor(private http: HttpClient) {}

  getPhasePaged(page: number): Observable<PhasePagedDTO> {
    return this.http.get<PhasePagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createPhase(dto: PhaseCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deletePhase(phaseId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${phaseId}`);
  }
}