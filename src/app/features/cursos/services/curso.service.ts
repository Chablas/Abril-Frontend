import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  CursoDto,
  CursoSlideDto,
  CursoUpsertDto,
  CursoSlideUpsertDto,
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

  // ---- Administración de cursos/slides (editor) ----

  getCursosAdmin(): Observable<CursoDto[]> {
    return this.http.get<CursoDto[]>(`${this.base}/admin`, { headers: this.headers() });
  }

  getSlidesAdmin(cursoId: number): Observable<CursoSlideDto[]> {
    return this.http.get<CursoSlideDto[]>(`${this.base}/${cursoId}/slides/admin`, {
      headers: this.headers(),
    });
  }

  crearCurso(dto: CursoUpsertDto): Observable<CursoDto> {
    return this.http.post<CursoDto>(this.base, dto, { headers: this.headers() });
  }

  actualizarCurso(cursoId: number, dto: CursoUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${cursoId}`, dto, { headers: this.headers() });
  }

  crearSlide(cursoId: number, dto: CursoSlideUpsertDto): Observable<CursoSlideDto> {
    return this.http.post<CursoSlideDto>(`${this.base}/${cursoId}/slides`, dto, {
      headers: this.headers(),
    });
  }

  actualizarSlide(slideId: number, dto: CursoSlideUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/slides/${slideId}`, dto, {
      headers: this.headers(),
    });
  }

  duplicarSlide(slideId: number, cursoDestinoId?: number): Observable<CursoSlideDto> {
    const params = cursoDestinoId ? `?cursoDestinoId=${cursoDestinoId}` : '';
    return this.http.post<CursoSlideDto>(`${this.base}/slides/${slideId}/duplicar${params}`, {}, {
      headers: this.headers(),
    });
  }

  eliminarSlide(slideId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/slides/${slideId}`, { headers: this.headers() });
  }

  /** Sube una imagen (portada, tarjeta, galería, etc.) y devuelve su URL pública. */
  subirImagen(archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${this.base}/imagenes`, formData, {
      headers: this.headers(),
    });
  }
}
