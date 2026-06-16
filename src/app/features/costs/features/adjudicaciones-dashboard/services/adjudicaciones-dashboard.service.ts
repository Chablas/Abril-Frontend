import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AdjudicacionesDashboardDTO } from '../dtos/adjudicaciones-dashboard.dto';

@Injectable({ providedIn: 'root' })
export class AdjudicacionesDashboardService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectSubContractor`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getDashboard(): Observable<AdjudicacionesDashboardDTO> {
    return this.http.get<AdjudicacionesDashboardDTO>(`${this.apiUrl}/dashboard`, {
      headers: this.authHeaders(),
    });
  }
}
