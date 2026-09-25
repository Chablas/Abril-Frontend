import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';

import { AuthService } from './auth.service';
import { MicrosoftAuthService } from '../../features/auth/pages/login/services/microsoft-auth.service';

/** Header con el que viaja la verificación (`IVerificacionMfaFirma.Header` en el backend). */
export const FIRMA_MFA_HEADER = 'X-Firma-Mfa';

/**
 * Verificación de Microsoft (contraseña + Authenticator) antes de estampar la firma en Consolidados
 * y Facturas. El backend acepta el token mientras ese inicio de sesión tenga menos de 10 minutos;
 * acá se reusa hasta un minuto antes, así aprobar varios seguidos —o reintentar después de
 * registrar la firma— no vuelve a abrir Microsoft.
 *
 * Solo vive en memoria y atado a la sesión de la intranet: recargar la página, cerrar sesión o
 * entrar con otra cuenta obliga a verificar de nuevo.
 */
@Injectable({ providedIn: 'root' })
export class FirmaMfaService {
  private static readonly REUSO_MS = 9 * 60 * 1000;

  private vigente: { token: string; email: string | null; sesion: string; hasta: number } | null = null;

  /** Por qué no se pudo conseguir el último token, para avisarlo si el backend lo exige. */
  private motivoSinToken: string | null = null;

  constructor(
    private microsoftAuth: MicrosoftAuthService,
    private authService: AuthService,
  ) {}

  /**
   * La verificación para mandar con la firma:
   * - el token;
   * - `''` si no se pudo conseguir: la firma se manda igual y decide el backend (`FirmaMfa:Exigir`,
   *   la válvula de emergencia). Si la exige responde 403 y `avisarSiFalto` dice por qué faltó;
   * - `null` si el usuario cerró la ventana de Microsoft: la firma no sigue.
   *
   * Llamarlo apenas se confirma la acción, sin otra espera en el medio: el navegador solo deja
   * abrir la ventana de Microsoft justo después de un click.
   */
  async obtener(): Promise<string | null> {
    const email = this.authService.getUserEmail();
    const sesion = this.authService.getSessionToken();
    const v = this.vigente;
    if (v && sesion && v.sesion === sesion && v.email === email && Date.now() < v.hasta) return v.token;
    this.vigente = null;
    this.motivoSinToken = null;

    Swal.fire({
      title: 'Verificando con Microsoft',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const token = await this.microsoftAuth.getFirmaMfaToken(email);
      Swal.close();
      if (sesion) this.vigente = { token, email, sesion, hasta: this.reusableHasta(token) };
      return token;
    } catch (err: any) {
      const codigo: string = err?.errorCode ?? '';
      // Otro intento tomó la ventana de Microsoft y es dueño del aviso de carga: no tocarlo.
      if (codigo === 'interaction_in_progress_cancelled') return null;
      Swal.close();
      // Cerró la ventana: no firmó, y lo sabe.
      if (codigo === 'user_cancelled') return null;
      this.motivoSinToken = this.motivo(codigo);
      return '';
    }
  }

  /**
   * Para el error de la firma. Olvida el token (la próxima firma vuelve a verificar) y, si la firma
   * salió sin verificación porque no se pudo conseguir y el backend la rechazó, avisa el motivo real
   * en vez del mensaje del backend. Devuelve true si ya avisó.
   */
  avisarSiFalto(err: HttpErrorResponse, firmaMfa: string): boolean {
    this.vigente = null;
    const motivo = this.motivoSinToken;
    if (firmaMfa || err.status !== 403 || !motivo) return false;
    Swal.fire({ icon: 'warning', title: 'No se firmó', text: motivo, confirmButtonColor: '#64BC04' });
    return true;
  }

  /** Hasta cuándo reusarlo: un minuto antes de que el backend lo dé por vencido. Sin `auth_time`, nunca. */
  private reusableHasta(token: string): number {
    try {
      const { auth_time } = jwtDecode<{ auth_time?: number }>(token);
      return auth_time ? auth_time * 1000 + FirmaMfaService.REUSO_MS : 0;
    } catch {
      return 0;
    }
  }

  private motivo(codigo: string): string {
    switch (codigo) {
      case 'popup_window_error':
      case 'empty_window_error':
        return 'El navegador bloqueó la ventana de Microsoft.';
      case 'timed_out':
        return 'La verificación de Microsoft no terminó.';
      default:
        return codigo
          ? `No se completó la verificación de Microsoft (${codigo}).`
          : 'No se completó la verificación de Microsoft.';
    }
  }
}
