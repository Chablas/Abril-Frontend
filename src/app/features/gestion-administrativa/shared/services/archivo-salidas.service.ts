import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Los archivos del módulo —planillas, documentos del consolidado y adjuntos de los trayectos—
 * para mostrarlos embebidos en los modales (`app-documento-embebido`). Los sirve el backend porque
 * el navegador no puede leer un webUrl de SharePoint directo; solo entrega URLs guardadas en el
 * módulo, y solo a su dueño o a quien tenga una bandeja de revisión.
 */
@Injectable({ providedIn: 'root' })
export class ArchivoSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/archivos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** El archivo por su webUrl, tal como viene en el DTO del modal. */
  getArchivo(url: string): Observable<Blob> {
    return this.http.get(this.apiUrl, {
      headers: this.headers,
      params: { url },
      responseType: 'blob',
    });
  }
}
