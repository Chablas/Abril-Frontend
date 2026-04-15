import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SunatCompanyDTO } from '../dtos/sunatCompany.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContractorService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/contractorRegistration`;

  constructor(private http: HttpClient) {}

  getCompanyBySunat(ruc: string): Observable<SunatCompanyDTO> {
    return this.http.get<SunatCompanyDTO>(`${this.apiUrl}/ruc/${ruc}`);
  }

  register(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData);
  }
}
