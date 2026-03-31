import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProjectSubContractorFormDataDTO } from '../dtos/projectSubContractorFormDataDTO.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
/*import { AreaPagedDTO } from '../dtos/area/areaPaged.model';
import { AreaCreateDTO } from '../dtos/area/areaCreate.model';
import { AreaEditDTO } from '../dtos/area/areaEdit.model';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';*/

@Injectable({
  providedIn: 'root',
})
export class AdjudicacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectSubContractor`;

  constructor(private http: HttpClient) {}

  getFormData(): Observable<ProjectSubContractorFormDataDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectSubContractorFormDataDTO>(`${this.apiUrl}/form-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createAdjudicacion(form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
