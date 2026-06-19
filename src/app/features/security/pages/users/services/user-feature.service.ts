import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { UserListItemDto } from '../../../../../core/dtos/user/userListItem.model';
import { UserFeatureCreateDto } from '../../../../../core/dtos/user/userFeatureCreate.model';
import { UserFeatureUpdateDto } from '../../../../../core/dtos/user/userFeatureUpdate.model';
import { AbrilWorkerOptionDto } from '../../../../../core/dtos/user/abrilWorkerOption.model';
import { AbrilWorkerUserCreateDto } from '../../../../../core/dtos/user/abrilWorkerUserCreate.model';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class UserFeatureService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/user-feature`;

  constructor(private http: HttpClient) {}

  getUserPaged(
    page: number,
    pageSize = 10,
    search?: string,
  ): Observable<PagedResponseDTO<UserListItemDto>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search && search.trim()) params.set('search', search.trim());
    return this.http.get<PagedResponseDTO<UserListItemDto>>(
      `${this.apiUrl}/paged?${params.toString()}`,
      { headers: buildAuthHeaders() },
    );
  }

  createUser(dto: UserFeatureCreateDto): Observable<any> {
    return this.http.post(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  /** Trabajadores de Abril (@abril.pe) que aún no tienen usuario en app_user. */
  getAbrilWorkersWithoutUser(): Observable<AbrilWorkerOptionDto[]> {
    return this.http.get<AbrilWorkerOptionDto[]>(
      `${this.apiUrl}/abril-workers/without-user`,
      { headers: buildAuthHeaders() },
    );
  }

  createAbrilWorkerUser(dto: AbrilWorkerUserCreateDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/abril-worker`, dto, { headers: buildAuthHeaders() });
  }

  updateUser(id: number, dto: UserFeatureUpdateDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  toggleUser(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: buildAuthHeaders() });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: buildAuthHeaders() });
  }
}
