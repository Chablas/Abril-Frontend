import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface AreaSubareaDTO {
  areaSubareaId: number;
  areaId: number;
  subAreaId: number | null;
}

export interface ScopeItemDTO {
  scopeItemId: number;
  areaSubareaId: number;
  catalogItemId: number;
  catalogItemDescription: string;
  catalogTypeName: string;
  scopeItemParentId: number | null;
  displayOrder: number;
  active: boolean;
  children: ScopeItemDTO[];
}

export interface ScopeItemNodeDTO {
  catalogItemId: number;
  parentCatalogItemId: number | null;
  displayOrder: number;
}

export interface ScopeItemUpsertDTO {
  areaSubareaId: number;
  items: ScopeItemNodeDTO[];
}

export interface ScopeTemplateItemNodeDTO {
  catalogItemId: number;
  catalogItemDescription: string;
  scopeTemplateItemParentId: number | null;
  displayOrder: number;
}

export interface ScopeTemplateDTO {
  scopeTemplateId: number;
  templateName: string;
  active: boolean;
  items: ScopeTemplateItemNodeDTO[];
}

export interface ScopeTemplateCreateDTO {
  templateName: string;
  items: ScopeTemplateItemNodeDTO[];
}

export interface ScopeTemplateUpdateDTO {
  scopeTemplateId: number;
  templateName: string;
  items: ScopeTemplateItemNodeDTO[];
}

@Injectable({ providedIn: 'root' })
export class ScopeService {
  private readonly base = `${environment.apiUrl}api/v1/mejora-continua/scope`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getOrCreateAreaSubarea(areaId: number, subAreaId?: number): Observable<AreaSubareaDTO> {
    let url = `${this.base}/area-subarea?areaId=${areaId}`;
    if (subAreaId) url += `&subAreaId=${subAreaId}`;
    return this.http.get<AreaSubareaDTO>(url, { headers: this.authHeaders() });
  }

  getScopeTree(areaSubareaId: number): Observable<ScopeItemDTO[]> {
    return this.http.get<ScopeItemDTO[]>(`${this.base}/tree/${areaSubareaId}`, {
      headers: this.authHeaders(),
    });
  }

  upsertScope(dto: ScopeItemUpsertDTO): Observable<unknown> {
    return this.http.put(`${this.base}/tree`, dto, { headers: this.authHeaders() });
  }

  getTemplates(): Observable<ScopeTemplateDTO[]> {
    return this.http.get<ScopeTemplateDTO[]>(`${this.base}/templates`, {
      headers: this.authHeaders(),
    });
  }

  createTemplate(dto: ScopeTemplateCreateDTO): Observable<unknown> {
    return this.http.post(`${this.base}/templates`, dto, { headers: this.authHeaders() });
  }

  updateTemplate(dto: ScopeTemplateUpdateDTO): Observable<unknown> {
    return this.http.put(`${this.base}/templates`, dto, { headers: this.authHeaders() });
  }

  deleteTemplate(scopeTemplateId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/templates/${scopeTemplateId}`, {
      headers: this.authHeaders(),
    });
  }
}
