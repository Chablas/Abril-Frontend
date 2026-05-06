import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { UserListItemDto } from '../../../../../core/dtos/user/userListItem.model';
import { UserFeatureCreateDto } from '../../../../../core/dtos/user/userFeatureCreate.model';
import { UserFeatureUpdateDto } from '../../../../../core/dtos/user/userFeatureUpdate.model';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class UserFeatureService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/user-feature`;

  constructor(private http: HttpClient) {}

  getUserPaged(page: number, pageSize = 10): Observable<PagedResponseDTO<UserListItemDto>> {
    return this.http.get<PagedResponseDTO<UserListItemDto>>(
      `${this.apiUrl}/paged?page=${page}&pageSize=${pageSize}`,
      { headers: buildAuthHeaders() },
    );
  }

  createUser(dto: UserFeatureCreateDto): Observable<any> {
    return this.http.post(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  updateUser(id: number, dto: UserFeatureUpdateDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  toggleUser(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: buildAuthHeaders() });
  }
}
