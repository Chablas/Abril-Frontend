import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { CostsPasoDto, CostsPasoOptionUpdateDto } from '../dtos/costs-paso.dto';

@Injectable({ providedIn: 'root' })
export class CostsPasosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/CostsPasos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPasos(): Observable<CostsPasoDto[]> {
    return this.http.get<CostsPasoDto[]>(this.apiUrl, { headers: this.headers });
  }

  updateOption(dto: CostsPasoOptionUpdateDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/option`, dto, { headers: this.headers });
  }
}
