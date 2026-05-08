import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SunatContributorDTO } from '../dtos/sunatCompany.model';
import { ReniecPersonDTO } from '../dtos/reniecPerson.model';
import { ContractorPersonTypeDTO } from '../dtos/companyRegister.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContractorService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/contractorRegistration`;

  constructor(private http: HttpClient) {}

  getPersonTypes(): Observable<ContractorPersonTypeDTO[]> {
    return this.http.get<ContractorPersonTypeDTO[]>(`${this.apiUrl}/person-types`);
  }

  getCompanyBySunat(ruc: string): Observable<SunatContributorDTO> {
    return this.http.get<SunatContributorDTO>(`${this.apiUrl}/ruc/${ruc}`);
  }

  getPersonByDni(dni: string): Observable<ReniecPersonDTO> {
    return this.http.get<ReniecPersonDTO>(`${this.apiUrl}/dni/${dni}`);
  }

  register(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData);
  }
}
