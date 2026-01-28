import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhaseStageSubStageSubSpecialtyShowFormDataDTO } from "../models/phaseStageSubStageSubSpecialtyFormData.model";
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from "../models/phaseStageSubStageSubSpecialtyCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhaseStageSubStageSubSpecialtyService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/phaseStageSubStageSubSpecialty`;

  constructor(private http: HttpClient) {}

  getFormData(): Observable<PhaseStageSubStageSubSpecialtyShowFormDataDTO> {
    return this.http.get<PhaseStageSubStageSubSpecialtyShowFormDataDTO>(`${this.apiUrl}/form-data`);
  }
  createPhaseStageSubStageSubSpecialty(form: PhaseStageSubStageSubSpecialtySendFormDataDTO) {
    return this.http.post(`${this.apiUrl}`, form);
  }
  deletePhaseStageSubStageSubSpecialty(phaseStageSubStageSubSpecialtyId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${phaseStageSubStageSubSpecialtyId}`);
  }
}