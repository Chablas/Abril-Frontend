import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EvAccesoDto } from '../dtos/ev-acceso.model';

/**
 * Acceso real por puesto a los flujos de evaluaciones (jefe-ssoma, supervisor
 * contratista, gestión SSOMA, prevencionistas). Se cachea con shareReplay porque
 * varias pestañas de la misma sesión lo consultan y no cambia durante la sesión.
 */
@Injectable({ providedIn: 'root' })
export class EvAccesoService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/mi-acceso`;
  private acceso$?: Observable<EvAccesoDto>;
  // El caché es por token: si alguien cierra sesión y entra con otra cuenta sin
  // recargar la página (el logout de AuthService solo limpia localStorage, no
  // reinstancia los servicios singleton `providedIn: 'root'`), un shareReplay(1)
  // sin esta comprobación seguiría sirviendo el acceso de la cuenta anterior —
  // exactamente el bug real que hacía aparecer pestañas de otro puesto.
  private tokenDelCache?: string | null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAcceso(): Observable<EvAccesoDto> {
    const tokenActual = this.auth.getToken();
    if (!this.acceso$ || this.tokenDelCache !== tokenActual) {
      this.tokenDelCache = tokenActual;
      this.acceso$ = this.http
        .get<EvAccesoDto>(this.base, { headers: this.headers() })
        .pipe(shareReplay(1));
    }
    return this.acceso$;
  }
}
