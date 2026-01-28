import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AreaPagedDTO } from '../models/areaPaged.model';
import { AreaCreateDTO } from "../models/areaCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AreaService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/area`;

  constructor(private http: HttpClient) {}

  getAreaPaged(page: number): Observable<AreaPagedDTO> {
    return this.http.get<AreaPagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createArea(dto: AreaCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deleteArea(areaId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${areaId}`);
  }
}