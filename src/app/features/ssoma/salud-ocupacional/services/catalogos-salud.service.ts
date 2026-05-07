import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  ClinicaEmailCreateDto,
  ClinicaEmailDto,
  ClinicaSimpleDto,
  ClinicaUpsertDto,
  EmoTipoDto,
  EmoTipoUpsertDto,
  EmpresaSimpleDto,
  ExamenTipoDto,
  MedicoSimpleDto,
  MedicoUpsertDto,
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

  // ===== Admin (no cache) =====

  listClinicas(): Observable<ClinicaSimpleDto[]> {
    return this.http.get<ClinicaSimpleDto[]>(`${this.apiUrl}/clinicas`, {
      headers: buildAuthHeaders(),
    });
  }

  createClinica(dto: ClinicaUpsertDto): Observable<ClinicaSimpleDto> {
    return this.http
      .post<ClinicaSimpleDto>(`${this.apiUrl}/clinicas`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.clinicas$ = undefined)));
  }

  updateClinica(id: number, dto: ClinicaUpsertDto): Observable<ClinicaSimpleDto> {
    return this.http
      .put<ClinicaSimpleDto>(`${this.apiUrl}/clinicas/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.clinicas$ = undefined)));
  }

  getClinicaEmails(clinicaId: number): Observable<ClinicaEmailDto[]> {
    return this.http.get<ClinicaEmailDto[]>(`${this.apiUrl}/clinicas/${clinicaId}/emails`, {
      headers: buildAuthHeaders(),
    });
  }

  createClinicaEmail(clinicaId: number, dto: ClinicaEmailCreateDto): Observable<ClinicaEmailDto> {
    return this.http.post<ClinicaEmailDto>(`${this.apiUrl}/clinicas/${clinicaId}/emails`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  deleteClinicaEmail(clinicaId: number, emailId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clinicas/${clinicaId}/emails/${emailId}`, {
      headers: buildAuthHeaders(),
    });
  }

  listMedicos(): Observable<MedicoSimpleDto[]> {
    return this.http.get<MedicoSimpleDto[]>(`${this.apiUrl}/medicos`, {
      headers: buildAuthHeaders(),
    });
  }

  createMedico(dto: MedicoUpsertDto): Observable<MedicoSimpleDto> {
    return this.http
      .post<MedicoSimpleDto>(`${this.apiUrl}/medicos`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.medicos$ = undefined)));
  }

  updateMedico(id: number, dto: MedicoUpsertDto): Observable<MedicoSimpleDto> {
    return this.http
      .put<MedicoSimpleDto>(`${this.apiUrl}/medicos/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.medicos$ = undefined)));
  }

  listEmoTipos(): Observable<EmoTipoDto[]> {
    return this.http.get<EmoTipoDto[]>(`${this.apiUrl}/emo-tipos`, {
      headers: buildAuthHeaders(),
    });
  }

  createEmoTipo(dto: EmoTipoUpsertDto): Observable<EmoTipoDto> {
    return this.http
      .post<EmoTipoDto>(`${this.apiUrl}/emo-tipos`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.emoTipos$ = undefined)));
  }

  updateEmoTipo(id: number, dto: EmoTipoUpsertDto): Observable<EmoTipoDto> {
    return this.http
      .put<EmoTipoDto>(`${this.apiUrl}/emo-tipos/${id}`, dto, { headers: buildAuthHeaders() })
      .pipe(tap(() => (this.emoTipos$ = undefined)));
  }
}
