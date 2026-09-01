import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  BandejaOnboarding,
  OnboardingAccionResult,
  OnboardingCreate,
  OnboardingCreateResult,
} from '../dtos/onboarding.dto';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/onboarding`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Bandeja de Onboarding: resumen, fases, colaboradores ingresados y los candidatos aptos del
   * modal «Nuevo ingreso», todo en una sola petición.
   */
  getBandeja(): Observable<BandejaOnboarding> {
    return this.http.get<BandejaOnboarding>(`${this.apiUrl}/bandeja`, { headers: this.headers });
  }

  /**
   * Abre el onboarding de un colaborador. Ya no se sube ni se envía nada: la carta oferta se firmó
   * y se aprobó en Reclutamiento, y de ahí el backend hereda su ficha maestra y su file digital.
   */
  iniciar(datos: OnboardingCreate): Observable<OnboardingCreateResult> {
    return this.http.post<OnboardingCreateResult>(this.apiUrl, datos, { headers: this.headers });
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
