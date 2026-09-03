import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Banco, BancoUpsert } from '../dtos/banco.dto';

interface MessageResult {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/configuracion/bancos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Catálogo completo (activos e inactivos): la pantalla filtra en memoria. */
  list(): Observable<Banco[]> {
    return this.http.get<Banco[]>(this.apiUrl, { headers: this.headers });
  }

  create(dto: BancoUpsert): Observable<Banco> {
    return this.http.post<Banco>(this.apiUrl, dto, { headers: this.headers });
  }

  update(id: number, dto: BancoUpsert): Observable<Banco> {
    return this.http.put<Banco>(`${this.apiUrl}/${id}`, dto, { headers: this.headers });
  }

  delete(id: number): Observable<MessageResult> {
    return this.http.delete<MessageResult>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }
}
