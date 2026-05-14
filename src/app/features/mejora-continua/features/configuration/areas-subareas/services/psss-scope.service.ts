import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';

export interface UpdateScopePsssDTO {
  psssIds: number[];
}

@Injectable({ providedIn: 'root' })
export class PsssScopeService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/psss-scope`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getScopeByArea(areaId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/area/${areaId}`, {
      headers: this.authHeaders(),
    });
  }

  getScopeBySubArea(subAreaId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/subarea/${subAreaId}`, {
      headers: this.authHeaders(),
    });
  }

  updateScopeByArea(areaId: number, dto: UpdateScopePsssDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/area/${areaId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateScopeBySubArea(subAreaId: number, dto: UpdateScopePsssDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/subarea/${subAreaId}`, dto, {
      headers: this.authHeaders(),
    });
  }
}
