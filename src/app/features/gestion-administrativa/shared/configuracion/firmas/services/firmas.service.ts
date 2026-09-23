import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { FirmaTipoCodigo } from '../../../../../../core/firma/firma-personal.dto';
import { FirmaTiposResult, FirmaTiposSaveResult } from '../dtos/firma-tipo.dto';

/**
 * Sección "Firmas" de Consolidados → Configuración: cómo se registra la firma que el jefe estampa
 * al aprobar un consolidado (subiendo una imagen, dibujándola con el mouse, o cualquiera de las
 * dos).
 *
 * Cuelga de la configuración de Consolidados porque es la única pantalla que hace valer la regla:
 * lo que se marca acá decide qué firma se le exige a quien aprueba ahí.
 */
@Injectable({ providedIn: 'root' })
export class GaFirmasService {
  private readonly apiUrl =
    `${environment.apiUrl}api/v1/gestion-administrativa/consolidados/configuracion/firmas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  get(): Observable<FirmaTiposResult> {
    return this.http.get<FirmaTiposResult>(this.apiUrl, { headers: this.headers });
  }

  /** Manda el catálogo completo: el backend corta si quedan los dos apagados. */
  guardar(
    tipos: { codigo: FirmaTipoCodigo; activo: boolean }[],
  ): Observable<FirmaTiposSaveResult> {
    return this.http.put<FirmaTiposSaveResult>(this.apiUrl, { tipos }, { headers: this.headers });
  }
}
