import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { PublicClientApplication, PopupRequest } from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { MicrosoftLoginResponseDTO } from '../dtos/microsoft-login-response.model';

@Injectable({ providedIn: 'root' })
export class MicrosoftAuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly scopes: PopupRequest = { scopes: ['User.Read', 'Files.ReadWrite'] };
  private readonly apiUrl = `${environment.apiUrl}api/v1/microsoft`;

  private msalInstance: PublicClientApplication | null = null;

  private async getMsalInstance(): Promise<PublicClientApplication> {
    if (!this.msalInstance) {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('msal.'))
        .forEach(k => sessionStorage.removeItem(k));

      this.msalInstance = new PublicClientApplication({
        auth: {
          clientId: environment.azure.clientId,
          authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
          redirectUri: `${this.document.location.origin}/auth-redirect.html`
        },
        system: {
          popupBridgeTimeout: 9000  // ms antes de lanzar timed_out si el popup se cierra sin responder
        }
      });
      await this.msalInstance.initialize();
    }
    return this.msalInstance;
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

  async login(): Promise<void> {
    const msal = await this.getMsalInstance();
    try {
      const result = await msal.loginPopup(this.scopes);
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
