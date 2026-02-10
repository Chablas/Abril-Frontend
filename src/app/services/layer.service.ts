import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LayerPagedDTO } from '../models/layer/layerPaged.model';
import { LayerCreateDTO } from '../models/layer/layerCreate.model';
import { environment } from '../../environments/environment';
import { LayerEditDTO } from '../models/layer/layerEdit.model';
import { ApiMessageDTO } from '../models/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class LayerService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/layer`;

  constructor(private http: HttpClient) {}

  getLayerPaged(page: number): Observable<LayerPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<LayerPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createLayer(dto: LayerCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editLayer(dto: LayerEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteLayer(layerId: number, updatedUserId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${layerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
