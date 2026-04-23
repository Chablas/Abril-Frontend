import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  EmpresaSimpleDto,
  ExamenTipoDto,
  MedicoSimpleDto,
  RestriccionTipoDto,
} from '../dtos/catalogos.model';

@Injectable({ providedIn: 'root' })
export class CatalogosSaludService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/catalogos`;

  private clinicas$?: Observable<ClinicaSimpleDto[]>;
  private medicos$?: Observable<MedicoSimpleDto[]>;
  private emoTipos$?: Observable<EmoTipoDto[]>;
  private examenTipos$?: Observable<ExamenTipoDto[]>;
  private restriccionTipos$?: Observable<RestriccionTipoDto[]>;
  private empresas$?: Observable<EmpresaSimpleDto[]>;

  constructor(private http: HttpClient) {}

  getClinicas(): Observable<ClinicaSimpleDto[]> {
    this.clinicas$ ??= this.http
      .get<ClinicaSimpleDto[]>(`${this.apiUrl}/clinicas`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.clinicas$;
  }

  getMedicos(): Observable<MedicoSimpleDto[]> {
    this.medicos$ ??= this.http
      .get<MedicoSimpleDto[]>(`${this.apiUrl}/medicos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.medicos$;
  }

  getEmoTipos(): Observable<EmoTipoDto[]> {
    this.emoTipos$ ??= this.http
      .get<EmoTipoDto[]>(`${this.apiUrl}/emo-tipos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.emoTipos$;
  }

  getExamenTipos(): Observable<ExamenTipoDto[]> {
    this.examenTipos$ ??= this.http
      .get<ExamenTipoDto[]>(`${this.apiUrl}/examen-tipos`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.examenTipos$;
  }

  getRestriccionTipos(): Observable<RestriccionTipoDto[]> {
    this.restriccionTipos$ ??= this.http
      .get<RestriccionTipoDto[]>(`${this.apiUrl}/restriccion-tipos`, {
        headers: buildAuthHeaders(),
      })
      .pipe(shareReplay(1));
    return this.restriccionTipos$;
  }

  getEmpresas(): Observable<EmpresaSimpleDto[]> {
    this.empresas$ ??= this.http
      .get<EmpresaSimpleDto[]>(`${this.apiUrl}/empresas`, { headers: buildAuthHeaders() })
      .pipe(shareReplay(1));
    return this.empresas$;
  }

  invalidateCache(): void {
    this.clinicas$ = undefined;
    this.medicos$ = undefined;
    this.emoTipos$ = undefined;
    this.examenTipos$ = undefined;
    this.restriccionTipos$ = undefined;
    this.empresas$ = undefined;
  }
}
