import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { PublicClientApplication, PopupRequest, BrowserCacheLocation } from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { MicrosoftLoginResponseDTO } from '../dtos/microsoft-login-response.model';

@Injectable({ providedIn: 'root' })
export class MicrosoftAuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly scopes: PopupRequest = { scopes: ['User.Read', 'Files.ReadWrite', 'Mail.Send'] };
  private readonly apiUrl = `${environment.apiUrl}api/v1/microsoft`;

  private msalInstance: PublicClientApplication | null = null;

  private async getMsalInstance(): Promise<PublicClientApplication> {
    if (!this.msalInstance) {
      // Limpiar estado residual de interacciones previas.
      // Ocurre cuando el usuario refresca la página mientras el popup de Microsoft
      // estaba abierto: MSAL deja en sessionStorage una marca "interaction.status"
      // que bloquea futuros intentos con el error "interaction_in_progress".
      this.clearStaleInteractionState();

      this.msalInstance = new PublicClientApplication({
        auth: {
          clientId: environment.azure.clientId,
          authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
          redirectUri: `${this.document.location.origin}/auth-redirect.html`
        },
        cache: {
          cacheLocation: BrowserCacheLocation.LocalStorage  // sobrevive recargas de página
        },
        system: {
          popupBridgeTimeout: 9000  // ms antes de lanzar timed_out si el popup se cierra sin responder
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

  async logout(): Promise<void> {
    // Limpiar cache de MSAL del localStorage (claves propias de la librería)
    Object.keys(localStorage)
      .filter(k => k.startsWith('msal.') || k.includes(environment.azure.clientId))
      .forEach(k => localStorage.removeItem(k));

    // Limpiar claves de la app
    ['access_token', 'session_token', 'token_expires_at', 'graph_access_token', 'user']
      .forEach(key => localStorage.removeItem(key));

    this.msalInstance = null;
  }

  async login(): Promise<void> {
    const msal = await this.getMsalInstance();
    try {
      // Si por alguna razón sigue habiendo estado residual, lo limpiamos y reintentamos.
      let result;
      try {
        result = await msal.loginPopup(this.scopes);
      } catch (innerErr: any) {
        if (innerErr?.errorCode === 'interaction_in_progress') {
          this.clearStaleInteractionState();
          result = await msal.loginPopup(this.scopes);
        } else {
          throw innerErr;
        }
      }
      const microsoftToken = result.accessToken;

      const response = await firstValueFrom(
        this.http.post<MicrosoftLoginResponseDTO>(`${this.apiUrl}/login`, null, {
          headers: { Authorization: `Bearer ${microsoftToken}` }
        })
      );

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
    } catch (err) {
      this.msalInstance = null;
      throw err;
    }
  }
}
