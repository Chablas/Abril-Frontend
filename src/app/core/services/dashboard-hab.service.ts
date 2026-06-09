import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardAdminDto } from '../dtos/habilitacion/dashboard-hab.model';

@Injectable({ providedIn: 'root' })
export class DashboardHabService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/habilitacion/dashboard`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getResumen(): Observable<DashboardAdminDto> {
    return this.http.get<DashboardAdminDto>(this.apiUrl, { headers: this.authHeaders() });
  }
}
