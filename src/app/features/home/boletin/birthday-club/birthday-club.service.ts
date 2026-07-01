import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/** Una persona cumpleañera del trimestre (espejo del DTO del backend). */
export interface CumpleaneroDto {
  workerId: number;
  nombreCompleto: string;
  ocupacion?: string | null;
  email: string;
  /** Mes del cumpleaños (1-12). */
  mes: number;
  /** Día del cumpleaños (1-31). */
  dia: number;
  /** Foto en data URI base64, o null si Graph no devolvió foto. */
  fotoBase64?: string | null;
}

export interface TrimestreCumpleanosDto {
  trimestre: number;
  cumpleaneros: CumpleaneroDto[];
}

/**
 * Trae los cumpleaños del boletín por trimestre. Cachea cada trimestre con `shareReplay`
 * para que, una vez descargados datos + fotos, navegar entre trimestres ya visitados sea
 * instantáneo y no vuelva a pegarle al backend/Graph.
 */
@Injectable({ providedIn: 'root' })
export class BirthdayClubService {
  private readonly base = `${environment.apiUrl}api/v1/boletin/cumpleanos`;
  private readonly cache = new Map<number, Observable<TrimestreCumpleanosDto>>();

  constructor(private http: HttpClient) {}

  getTrimestre(trimestre: number): Observable<TrimestreCumpleanosDto> {
    let cached = this.cache.get(trimestre);
    if (!cached) {
      cached = this.http
        .get<TrimestreCumpleanosDto>(`${this.base}/trimestre/${trimestre}`, {
          headers: this.authHeaders(),
        })
        .pipe(shareReplay(1));
      this.cache.set(trimestre, cached);
    }
    return cached;
  }

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
