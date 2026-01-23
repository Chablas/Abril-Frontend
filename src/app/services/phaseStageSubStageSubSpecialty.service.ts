import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhaseStageSubStageSubSpecialtyShowFormDataDTO } from "../models/phaseStageSubStageSubSpecialtyFormData.model";
import { PhaseStageSubStageSubSpecialtySendFormDataDTO } from "../models/phaseStageSubStageSubSpecialtyCreate.model";

@Injectable({
  providedIn: 'root'
})
export class PhaseStageSubStageSubSpecialtyService {

  private readonly apiUrl = 'http://localhost:5236/api/v1/phaseStageSubStageSubSpecialty';

  constructor(private http: HttpClient) {}

  getFormData(): Observable<PhaseStageSubStageSubSpecialtyShowFormDataDTO> {
    return this.http.get<PhaseStageSubStageSubSpecialtyShowFormDataDTO>(`${this.apiUrl}/form-data`);
  }
  createPhaseStageSubStageSubSpecialty(form: PhaseStageSubStageSubSpecialtySendFormDataDTO) {
    return this.http.post(`${this.apiUrl}`, form);
  }
}