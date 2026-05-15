import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface CatalogItemDTO {
  catalogItemId: number;
  catalogTypeId: number;
  catalogTypeName: string;
  catalogTypeCode: string;
  catalogItemParentId: number | null;
  catalogItemDescription: string;
  catalogItemCode: string | null;
  active: boolean;
  children: CatalogItemDTO[];
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly base = `${environment.apiUrl}api/v1/mejora-continua/catalog`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getFullTree(): Observable<CatalogItemDTO[]> {
    return this.http.get<CatalogItemDTO[]>(`${this.base}/full-tree`, {
      headers: this.authHeaders(),
    });
  }
}
