import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicaInterconsultaCreateDto } from '../dtos/clinica.model';

@Injectable({ providedIn: 'root' })
export class InterconsultaClinicaService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/interconsultas`;

  constructor(private http: HttpClient) {}

  createInterconsulta(dto: ClinicaInterconsultaCreateDto, documento?: File): Observable<any> {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();

    formData.append('workerId', dto.workerId.toString());
    formData.append('especialidad', dto.especialidad);
    formData.append('programacionId', dto.programacionId.toString());
    if (dto.centroAtencion)  formData.append('centroAtencion', dto.centroAtencion);
    if (dto.diagnostico)     formData.append('diagnostico', dto.diagnostico);
    if (dto.cie10)           formData.append('cie10', dto.cie10);
    if (dto.medicoDerivaId)  formData.append('medicoDerivaId', dto.medicoDerivaId.toString());
    formData.append('requiereSeguimiento', dto.requiereSeguimiento ? 'true' : 'false');
    if (documento) formData.append('documento', documento, documento.name);

    return this.http.post(this.base, formData, {
      // NO Content-Type — el browser lo setea con el boundary automáticamente
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
  }
}
