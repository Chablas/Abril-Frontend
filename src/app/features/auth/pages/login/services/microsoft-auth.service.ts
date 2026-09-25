import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  PublicClientApplication,
  PopupRequest,
  BrowserCacheLocation,
  BrowserAuthError,
  BrowserAuthErrorCodes,
} from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { MicrosoftLoginResponseDTO } from '../dtos/microsoft-login-response.model';

/**
 * MSAL v5 ya no se entera de que el usuario cerró la ventana de Microsoft: espera la respuesta
 * de `auth-redirect.html` (por BroadcastChannel) hasta `popupBridgeTimeout` y recién ahí falla
 * con `timed_out`. Esta subclase vigila la ventana mientras dura esa espera y corta con
 * `user_cancelled` apenas se cierra, así el timeout puede ser largo sin dejar el loader colgado.
 *
 * El cierre cuenta solo si la intranet recuperó el foco. Cuando Microsoft active COOP en su login
 * (hoy lo manda en modo Report-Only) la referencia a la ventana se corta y `closed` pasa a true
 * aunque siga abierta; mientras el usuario esté escribiendo en ella, la intranet no tiene el foco
 * y el login no se interrumpe.
 */
class MsalConCierreDePopup extends PublicClientApplication {
  protected override waitForPopupResponse(
    ...args: Parameters<PublicClientApplication['waitForPopupResponse']>
  ): Promise<string> {
    const popup = args[1];
    let dejarDeVigilar = () => {};
    const cerrado = new Promise<never>((_, reject) => {
      let lecturas = 0;
      const vigilancia = window.setInterval(() => {
        lecturas = popup.closed && document.hasFocus() ? lecturas + 1 : 0;
        // Dos lecturas seguidas (~1 s) dan margen a que llegue la respuesta cuando es la
        // propia ventana la que se cierra al terminar el login.
        if (lecturas >= 2) reject(new BrowserAuthError(BrowserAuthErrorCodes.userCancelled));
      }, 500);
      // Si la ventana quedó detrás de la intranet, un click en la intranet la trae al frente.
      const traerAlFrente = () => {
        if (!popup.closed) popup.focus();
      };
      document.addEventListener('pointerdown', traerAlFrente, true);
      dejarDeVigilar = () => {
        window.clearInterval(vigilancia);
        document.removeEventListener('pointerdown', traerAlFrente, true);
      };
    });
    return Promise.race([super.waitForPopupResponse(...args), cerrado]).finally(dejarDeVigilar);
  }
}

@Injectable({ providedIn: 'root' })
export class MicrosoftAuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly scopes: PopupRequest = {
    scopes: ['User.Read', 'Files.ReadWrite', 'Mail.Send'],
    // Fuerza el selector de cuenta en cada inicio de sesión. Sin esto, Azure AD
    // hace SSO silencioso reutilizando la sesión activa de Microsoft (la cookie de
    // login.microsoftonline.com que sobrevive a nuestro logout, ya que solo limpiamos
    // el cache local de MSAL y no cerramos sesión del lado de Microsoft). Así el
    // usuario siempre puede escoger otra cuenta de Abril tras cerrar sesión.
    prompt: 'select_account',
  };
  private readonly apiUrl = `${environment.apiUrl}api/v1/microsoft`;

  private msalInstance: PublicClientApplication | null = null;

  private async getMsalInstance(): Promise<PublicClientApplication> {
    if (!this.msalInstance) {
      // Limpiar estado residual de interacciones previas.
      // Ocurre cuando el usuario refresca la página mientras el popup de Microsoft
      // estaba abierto: MSAL deja en sessionStorage una marca "interaction.status"
      // que bloquea futuros intentos con el error "interaction_in_progress".
      this.clearStaleInteractionState();

      this.msalInstance = new MsalConCierreDePopup({
        auth: {
          clientId: environment.azure.clientId,
          authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
          redirectUri: `${this.document.location.origin}/auth-redirect.html`
        },
        cache: {
          cacheLocation: BrowserCacheLocation.LocalStorage  // sobrevive recargas de página
        },
        system: {
          // Tiempo TOTAL que se espera la respuesta del popup, contado desde que se abre (no
          // desde que se cierra). Con 9 s se cortaba el login de quien demoraba en elegir la
          // cuenta, escribir la clave o aprobar el MFA. El cierre del popup lo detecta
          // MsalConCierreDePopup, así que este límite solo aplica a una ventana abandonada.
          popupBridgeTimeout: 10 * 60 * 1000
        }
      });
      await this.msalInstance.initialize();
    }
    return this.msalInstance;
  }

  private clearStaleInteractionState(): void {
    // MSAL guarda el estado de interacción en sessionStorage con claves que
    // contienen "interaction.status" o "request.". Al refrescar la página
    // en medio de un popup, esas claves quedan huérfanas y bloquean el siguiente intento.
    const staleKeys = Object.keys(sessionStorage).filter(
      k => k.includes('interaction.status') || k.includes('request.state') || k.includes('request.params')
    );
    staleKeys.forEach(k => sessionStorage.removeItem(k));
  }

  async handleRedirect(): Promise<void> {
    const msal = new PublicClientApplication({
      auth: {
        clientId: environment.azure.clientId,
        authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
        redirectUri: `${this.document.location.origin}/auth-redirect.html`
      }
    });
    await msal.initialize();
    await msal.handleRedirectPromise();
  }

  /**
   * Devuelve un access token de Graph fresco.
   * 1. Si hay cuenta cacheada → intenta renovación silenciosa.
   * 2. Si el silent falla o no hay cuenta → abre popup de Microsoft.
   * 3. Si el usuario cierra el popup → lanza un error descriptivo.
   */
  async getGraphToken(): Promise<string> {
    const msal     = await this.getMsalInstance();
    const accounts = msal.getAllAccounts();

    // Paso 1: intentar adquisición silenciosa si hay cuenta en caché.
    if (accounts.length > 0) {
      try {
        const result = await msal.acquireTokenSilent({
          scopes:  this.scopes.scopes as string[],
          account: accounts[0],
        });
        localStorage.setItem('graph_access_token', result.accessToken);
        return result.accessToken;
      } catch {
        // Silent falló (token expirado sin refresh válido) → caer al popup.
      }
    }

    // Paso 2: popup interactivo (cubre token expirado Y sesión perdida).
    try {
      const popupRequest: PopupRequest = { scopes: this.scopes.scopes as string[] };
      if (accounts.length > 0) popupRequest.account = accounts[0];

      const result = await msal.acquireTokenPopup(popupRequest);
      localStorage.setItem('graph_access_token', result.accessToken);
      return result.accessToken;
    } catch (err: any) {
      // El usuario cerró el popup u ocurrió un error de MSAL.
      const isCancelled = err?.errorCode === 'user_cancelled'
        || err?.errorCode === 'popup_window_error'
        || err?.message?.includes('user_cancelled');

      throw new Error(
        isCancelled
          ? 'Inicio de sesión cancelado. Por favor inténtelo de nuevo.'
          : (err?.message ?? 'No se pudo autenticar con Microsoft. Por favor inténtelo de nuevo.')
      );
    }
  }

  /**
   * Fuerza un desafío de login interactivo de Microsoft (prompt=login, ignora la sesión
   * silenciosa/caché) y devuelve el access token resultante. A diferencia de
   * getGraphToken(), este NUNCA reutiliza una sesión ya abierta — existe específicamente
   * para el paso de "firma" de convalidaciones, donde se necesita probar que el médico
   * reautenticó su cuenta de Microsoft en ese acto exacto, no que solo tenía sesión activa.
   */
  async getFreshSignatureToken(): Promise<string> {
    const msal = await this.getMsalInstance();
    const accounts = msal.getAllAccounts();
    try {
      const result = await msal.acquireTokenPopup({
        scopes: ['User.Read'],
        prompt: 'login',
        account: accounts[0],
      });
      return result.accessToken;
    } catch (err: any) {
      const isCancelled = err?.errorCode === 'user_cancelled'
        || err?.errorCode === 'popup_window_error'
        || err?.message?.includes('user_cancelled');
      throw new Error(
        isCancelled
          ? 'Reautenticación cancelada. La firma requiere confirmar tu cuenta de Microsoft.'
          : (err?.message ?? 'No se pudo reautenticar con Microsoft para firmar.')
      );
    }
  }

  /**
   * Token para estampar la firma en Consolidados y Facturas: access token del ámbito `Firmar` de la
   * propia app, que el backend sí puede validar (uno de Graph no). `prompt=login` pide la contraseña
   * y el claims request exige el segundo factor si la última MFA tiene más de 10 minutos; el
   * backend comprueba en el token que ese inicio de sesión es reciente (`auth_time`) y trae `mfa`.
   *
   * Los errores de MSAL suben tal cual (con su `errorCode`): los traduce FirmaMfaService.
   */
  async getFirmaMfaToken(email: string | null): Promise<string> {
    const msal = await this.getMsalInstance();
    const cuentas = msal.getAllAccounts();
    // `email` es el mail de Graph; `username` de MSAL es el UPN. Si no coinciden (mail ≠ UPN), la
    // cuenta es la única que dejó el login de la intranet (el logout borra las demás).
    const cuenta =
      (email ? cuentas.find(a => a.username?.toLowerCase() === email.toLowerCase()) : undefined)
      ?? (cuentas.length === 1 ? cuentas[0] : undefined);
    const result = await msal.acquireTokenPopup({
      scopes: [`api://${environment.azure.clientId}/Firmar`],
      prompt: 'login',
      claims: JSON.stringify({ access_token: { amr: { essential: true, values: ['ngcmfa'] } } }),
      account: cuenta,
      // MSAL prefiere loginHint a la cuenta: el mail solo si no hay cuenta, porque puede no ser el
      // nombre con que se inicia sesión.
      loginHint: cuenta?.username ?? email ?? undefined,
      // Lo dispara el click en «Sí, aprobar»: si quedó un popup a medias, este lo reemplaza.
      overrideInteractionInProgress: true,
    });
    return result.accessToken;
  }

  async logout(): Promise<void> {
    // Limpiar cache de MSAL del localStorage (claves propias de la librería)
    Object.keys(localStorage)
      .filter(k => k.startsWith('msal.') || k.includes(environment.azure.clientId))
      .forEach(k => localStorage.removeItem(k));

    // Limpiar claves de la app
    ['access_token', 'session_token', 'token_expires_at', 'graph_access_token', 'user', 'allowed_features']
      .forEach(key => localStorage.removeItem(key));

    this.msalInstance = null;
  }

  async login(): Promise<void> {
    const msal = await this.getMsalInstance();
    try {
      // Lo dispara el click del usuario: si quedó una interacción a medias (un popup que nunca
      // respondió), la nueva la reemplaza en vez de fallar con interaction_in_progress. Es el
      // uso que la documentación de MSAL recomienda para este flag.
      const result = await msal.loginPopup({ ...this.scopes, overrideInteractionInProgress: true });
      const microsoftToken = result.accessToken;

      const response = await firstValueFrom(
        this.http.post<MicrosoftLoginResponseDTO>(`${this.apiUrl}/login`, null, {
          headers: { Authorization: `Bearer ${microsoftToken}` }
        })
      );

      ['access_token', 'session_token', 'token_expires_at', 'user', 'allowed_features',
       'contratista_scope', 'contratista_proyectos', 'contratista_modulos']
        .forEach(key => localStorage.removeItem(key));

      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('session_token', response.sessionToken);
      localStorage.setItem('token_expires_at', response.expiresAt);
      localStorage.setItem('graph_access_token', microsoftToken);
      if (response.allowedFeatures) {
        localStorage.setItem('allowed_features', JSON.stringify(response.allowedFeatures));
      }
      localStorage.setItem('user', JSON.stringify({
        displayName: response.displayName,
        givenName: response.givenName,
        surname: response.surname,
        email: response.mail ?? response.userPrincipalName,
        jobTitle: response.jobTitle,
        officeLocation: response.officeLocation,
        mobilePhone: response.mobilePhone,
        businessPhones: response.businessPhones,
        photoBase64: response.photoBase64
      }));

      // Cada inicio de sesión debe aterrizar en la portada (INICIO) del boletín.
      // El boletín usa esta marca para mostrar la portada una sola vez por sesión;
      // al loguear la limpiamos para que la portada vuelva a aparecer.
      sessionStorage.removeItem('boletin_portada_vista');
    } catch (err) {
      this.msalInstance = null;
      throw err;
    }
  }
}
