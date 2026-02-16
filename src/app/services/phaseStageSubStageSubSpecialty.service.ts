import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhaseStageSubStageSubSpecialtyFiltersCreateDTO } from "../models/phaseStageSubStageSubSpecialty/PhaseStageSubStageSubSpecialtyFiltersCreateDTO.model";
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from "../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyCreate.model";
import { PhaseStageSubStageSubSpecialtyFlatPagedDTO } from "../models/phaseStageSubStageSubSpecialty/phaseStageSubStageSubSpecialtyFlatPagedDTO.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhaseStageSubStageSubSpecialtyService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/phaseStageSubStageSubSpecialty`;

  constructor(private http: HttpClient) {}

  getFiltersCreate(): Observable<PhaseStageSubStageSubSpecialtyFiltersCreateDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PhaseStageSubStageSubSpecialtyFiltersCreateDTO>(`${this.apiUrl}/filters-create`, { headers: { Authorization: `Bearer ${token}` } });
  }
  createPhaseStageSubStageSubSpecialty(form: PhaseStageSubStageSubSpecialtySendFormDataDTO) {
    const token = localStorage.getItem('access_token');
    return this.http.post(`${this.apiUrl}`, form, { headers: { Authorization: `Bearer ${token}` } });
  }
  deletePhaseStageSubStageSubSpecialty(phaseStageSubStageSubSpecialtyId: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    return this.http.delete(`${this.apiUrl}/${phaseStageSubStageSubSpecialtyId}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  getPaged(page: number): Observable<PhaseStageSubStageSubSpecialtyFlatPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PhaseStageSubStageSubSpecialtyFlatPagedDTO>(`${this.apiUrl}/paged?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
  }
}