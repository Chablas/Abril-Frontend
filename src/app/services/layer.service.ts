import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LayerPagedDTO } from '../models/layer/layerPaged.model';
import { LayerCreateDTO } from "../models/layer/layerCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LayerService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/layer`;

  constructor(private http: HttpClient) {}

  getLayerPaged(page: number): Observable<LayerPagedDTO> {
    return this.http.get<LayerPagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createLayer(dto: LayerCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deleteLayer(layerId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${layerId}`);
  }
}