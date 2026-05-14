import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RelationFiltersDTO } from '../dtos/relation-filters.model';
import { CreateRelationDTO } from '../dtos/create-relation.model';
import { RelationFlatPagedDTO } from '../dtos/relation-flat.model';
import { environment } from '../../../../../../../environments/environment';

export interface RelationsPagedFilters {
  phaseId?: number | null;
  stageId?: number | null;
  layerId?: number | null;
  subStageId?: number | null;
  subSpecialtyId?: number | null;
  partidaId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RelationsService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/mejora-continua/relations`;

  constructor(private http: HttpClient) {}

  private get token(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  }

  getFilters(): Observable<RelationFiltersDTO> {
    return this.http.get<RelationFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }

  getPaged(page: number, filters?: RelationsPagedFilters): Observable<RelationFlatPagedDTO> {
    let params = new HttpParams().set('page', page.toString());
    if (filters?.phaseId) params = params.set('phaseId', filters.phaseId.toString());
    if (filters?.stageId) params = params.set('stageId', filters.stageId.toString());
    if (filters?.layerId) params = params.set('layerId', filters.layerId.toString());
    if (filters?.subStageId) params = params.set('subStageId', filters.subStageId.toString());
    if (filters?.subSpecialtyId) params = params.set('subSpecialtyId', filters.subSpecialtyId.toString());
    if (filters?.partidaId) params = params.set('partidaId', filters.partidaId.toString());
    return this.http.get<RelationFlatPagedDTO>(`${this.apiUrl}/paged`, {
      headers: { Authorization: `Bearer ${this.token}` },
      params,
    });
  }

  create(dto: CreateRelationDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }
}
