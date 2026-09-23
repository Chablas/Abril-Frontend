import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  CursoDto,
  CursoSlideDto,
  IniciarIntentoDto,
  IniciarIntentoResultDto,
  ResponderSlideDto,
  ResponderSlideResultDto,
  FinalizarIntentoDto,
  FinalizarIntentoResultDto,
  CursoIntentoDetalleDto,
} from '../dtos/curso.dtos';

@Injectable({ providedIn: 'root' })
export class CursoService {
  private base = `${environment.apiUrl}api/v1/curso`;
  private baseIntento = `${environment.apiUrl}api/v1/curso-intento`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getCursos(): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(this.base, { headers: this.headers() });
  }

  getSlides(cursoId: number): Observable<CursoSlideDto[]> {
    return this.http.get<CursoSlideDto[]>(`${this.base}/${cursoId}/slides`, {
      headers: this.headers(),
    });
  }

  iniciarIntento(dto: IniciarIntentoDto): Observable<IniciarIntentoResultDto> {
    return this.http.post<IniciarIntentoResultDto>(`${this.baseIntento}/iniciar`, dto, {
      headers: this.headers(),
    });
  }

  responder(intentoId: number, dto: ResponderSlideDto): Observable<ResponderSlideResultDto> {
    return this.http.post<ResponderSlideResultDto>(
      `${this.baseIntento}/${intentoId}/responder`,
      dto,
      { headers: this.headers() },
    );
  }

  finalizar(intentoId: number, dto: FinalizarIntentoDto): Observable<FinalizarIntentoResultDto> {
    return this.http.post<FinalizarIntentoResultDto>(
      `${this.baseIntento}/${intentoId}/finalizar`,
      dto,
      { headers: this.headers() },
    );
  }

  getDetalle(intentoId: number): Observable<CursoIntentoDetalleDto> {
    return this.http.get<CursoIntentoDetalleDto>(`${this.baseIntento}/${intentoId}`, {
      headers: this.headers(),
    });
  }
}
