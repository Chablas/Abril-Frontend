import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { SolicitudSalidaFormDataDto } from '../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto } from '../dtos/solicitud-salida-create.dto';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import { SolicitudSalidaFilterDataDto } from '../dtos/solicitud-salida-filter-data.dto';
import {
  SolicitudSalidaCapturaDto,
  SolicitudSalidaDetalleDto,
} from '../dtos/solicitud-salida-detalle.dto';

@Injectable({ providedIn: 'root' })
export class SolicitudSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getMySolicitudes(
    lugarProyectoId: number | null = null,
    estadoAprobacion: string | null = null,
    estadoRendicion: string | null = null,
  ): Observable<SolicitudSalidaListItemDto[]> {
    let params = new HttpParams();
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    return this.http.get<SolicitudSalidaListItemDto[]>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<SolicitudSalidaFilterDataDto> {
    return this.http.get<SolicitudSalidaFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getFormData(): Observable<SolicitudSalidaFormDataDto> {
    return this.http.get<SolicitudSalidaFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  create(dto: SolicitudSalidaCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.apiUrl, dto, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /** Sube capturas asociadas a un trayecto específico. */
  uploadCapturasToTrayecto(
    trayectoId: number,
    items: { file: File; monto: number }[],
  ): Observable<SolicitudSalidaCapturaDto[]> {
    const formData = new FormData();
    items.forEach((it) => {
      formData.append('files', it.file, it.file.name);
      formData.append('montos', it.monto.toString());
    });
    return this.http.post<SolicitudSalidaCapturaDto[]>(
      `${this.apiUrl}/trayectos/${trayectoId}/capturas`,
      formData,
      { headers: this.headers },
    );
  }
}
