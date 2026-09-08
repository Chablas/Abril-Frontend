import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ColaboradorFormularioPublico,
  ColaboradorFormularioRespuestas,
} from '../dtos/colaborador-formulario.dto';

interface MessageResult {
  message: string;
}

/**
 * Servicio de la página PÚBLICA del formulario «Nuevos Talentos» (acceso por token, sin login).
 * Por eso no manda el header Authorization: son endpoints [AllowAnonymous] del backend.
 */
@Injectable({ providedIn: 'root' })
export class ColaboradorFormularioService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/onboarding/formulario`;

  constructor(private http: HttpClient) {}

  /** Trae el formulario (contexto + catálogos + respuestas) por token. */
  getPublico(token: string): Observable<ColaboradorFormularioPublico> {
    return this.http.get<ColaboradorFormularioPublico>(`${this.apiUrl}/publico`, {
      params: { token },
    });
  }

  /** Envía las respuestas del colaborador. */
  guardarPublico(
    token: string,
    respuestas: ColaboradorFormularioRespuestas,
  ): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.apiUrl}/publico`, respuestas, {
      params: { token },
    });
  }
}
