import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirmaPersonalEstadoDto, FirmaTipoCodigo } from './firma-personal.dto';

/**
 * Lee y guarda las firmas del usuario logueado. Vive en `core/` y no dentro de una feature porque
 * la usan tres módulos —Contabilidad (Configuración → Firma), Gestión Administrativa
 * (Configuración → Tu firma) y el modal que aparece al firmar un consolidado por primera vez— y
 * las tres escriben las mismas filas.
 *
 * El usuario nunca viaja en la petición: el backend lo saca del token, así que nadie puede
 * registrar la firma de otro.
 */
@Injectable({ providedIn: 'root' })
export class FirmaPersonalService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/configuracion/mi-firma`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Tipos habilitados y firmas que el usuario ya registró. */
  get(): Observable<FirmaPersonalEstadoDto> {
    return this.http.get<FirmaPersonalEstadoDto>(this.apiUrl, { headers: this.headers });
  }

  /**
   * Guarda/actualiza la firma de un tipo y devuelve el estado completo ya actualizado (un solo
   * viaje: la pantalla no tiene que volver a pedirlo para refrescarse).
   *
   * @param imageBase64 data URL del PNG del canvas, o el del archivo que el usuario subió.
   */
  save(tipo: FirmaTipoCodigo, imageBase64: string): Observable<FirmaPersonalEstadoDto> {
    return this.http.put<FirmaPersonalEstadoDto>(
      this.apiUrl,
      { tipo, imageBase64 },
      { headers: this.headers },
    );
  }
}
