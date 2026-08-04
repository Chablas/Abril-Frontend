import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PostulanteFormularioPublico,
  PostulanteFormularioRespuestas,
} from '../dtos/postulante-formulario.dto';

interface MessageResult {
  message: string;
}

/**
 * Servicio de la página PÚBLICA del formulario del postulante (acceso por token, sin login).
 * Por eso no envía el header Authorization: son endpoints [AllowAnonymous] del backend.
 */
@Injectable({ providedIn: 'root' })
export class PostulanteFormularioService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/postulante-formulario`;

  constructor(private http: HttpClient) {}

  /** Trae el formulario (contexto + catálogos + respuestas) por token. */
  getPublico(token: string): Observable<PostulanteFormularioPublico> {
    return this.http.get<PostulanteFormularioPublico>(`${this.apiUrl}/publico`, {
      params: { token },
    });
  }

  /** Envía las respuestas del postulante. */
  guardarPublico(token: string, respuestas: PostulanteFormularioRespuestas): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.apiUrl}/publico`, respuestas, {
      params: { token },
    });
  }
}
