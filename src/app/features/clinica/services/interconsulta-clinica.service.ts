import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicaInterconsultaCreateDto } from '../dtos/clinica.model';

@Injectable({ providedIn: 'root' })
export class InterconsultaClinicaService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/interconsultas`;

  constructor(private http: HttpClient) {}

  createInterconsulta(dto: ClinicaInterconsultaCreateDto): Observable<any> {
    const token = localStorage.getItem('access_token');
    return this.http.post(this.base, dto, {
      headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    });
  }
}
