import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AuthService } from './auth.service';
import { MicrosoftAuthService } from '../../features/auth/pages/login/services/microsoft-auth.service';

/** Header con el que viaja la verificación (`IVerificacionMfaFirma.Header` en el backend). */
export const FIRMA_MFA_HEADER = 'X-Firma-Mfa';

/**
 * Verificación de Microsoft (contraseña + Authenticator, o un passkey) antes de estampar la firma
 * en Consolidados y Facturas. Cada firma abre Microsoft: la verificación no se reusa entre firmas
 * (pedido: «siempre que se vaya a firmar, que pida el 2FA»), y el backend tampoco acepta la misma
 * dos veces.
 *
 * La única excepción es el reintento de la MISMA firma después de registrarla (el 409 de
 * Consolidados): esa pantalla guarda el token del primer intento y lo vuelve a mandar.
 */
@Injectable({ providedIn: 'root' })
export class FirmaMfaService {
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
   * Para el error de la firma: si salió sin verificación porque no se pudo conseguir y el backend
   * la rechazó, avisa el motivo real en vez del mensaje del backend. Devuelve true si ya avisó.
   */
  avisarSiFalto(err: HttpErrorResponse, firmaMfa: string): boolean {
    const motivo = this.motivoSinToken;
    if (firmaMfa || err.status !== 403 || !motivo) return false;
    Swal.fire({ icon: 'warning', title: 'No se firmó', text: motivo, confirmButtonColor: '#64BC04' });
    return true;
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
