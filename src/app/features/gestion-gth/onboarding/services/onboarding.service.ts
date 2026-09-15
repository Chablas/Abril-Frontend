import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BandejaOnboarding, OnboardingAccionResult } from '../dtos/onboarding.dto';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/onboarding`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Bandeja de Onboarding: resumen, fases y colaboradores ingresados, en una sola petición. El
   * backend le abre el onboarding, de paso, a todo el que ya terminó reclutamiento.
   */
  getBandeja(): Observable<BandejaOnboarding> {
    return this.http.get<BandejaOnboarding>(`${this.apiUrl}/bandeja`, { headers: this.headers });
  }

  /**
   * Envía el aviso al coordinador administrativo de la obra donde entra el colaborador y marca esa
   * actividad del checklist como cumplida.
   */
  enviarAvisoObra(onboardingId: number): Observable<OnboardingAccionResult> {
    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/aviso-obra`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Envía el correo de bienvenida: le abre al colaborador su formulario «Nuevos Talentos» y le
   * manda el enlace, la documentación que tiene que enviar y la fecha límite.
   *
   * Multipart: `data` = JSON con la fecha límite; `archivos` = los documentos normativos que GTH
   * quiera adjuntar (opcionales; el backend valida formato y tope de tamaño).
   */
  enviarBienvenida(
    onboardingId: number,
    fechaLimite: string | null,
    archivos: File[],
  ): Observable<OnboardingAccionResult> {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ fechaLimite }));
    for (const archivo of archivos) formData.append('archivos', archivo, archivo.name);

    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/formulario/${onboardingId}/bienvenida`,
      formData,
      { headers: this.headers },
    );
  }

  /** Avanza el onboarding a la fase siguiente del checklist. */
  avanzarFase(onboardingId: number): Observable<OnboardingAccionResult> {
    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/avanzar`,
      {},
      { headers: this.headers },
    );
  }
}
