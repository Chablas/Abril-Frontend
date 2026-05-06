import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProgramacionAlertasService {
  private _rechazados = new BehaviorSubject<number>(0);
  rechazados$ = this._rechazados.asObservable();

  constructor(private http: HttpClient) {}

  checkRechazados(): void {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    const hoy = new Date().toISOString().split('T')[0];
    this.http
      .get<any>(
        `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/programaciones`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { desde: hoy, hasta: hoy, estado: 'Rechazado por Clínica', pageSize: '500' },
        },
      )
      .subscribe({
        next: (res) => {
          const count = Array.isArray(res) ? res.length : (res?.data?.length ?? res?.totalRecords ?? 0);
          this._rechazados.next(count);
        },
        error: () => this._rechazados.next(0),
      });
  }

  clear(): void {
    this._rechazados.next(0);
  }
}
