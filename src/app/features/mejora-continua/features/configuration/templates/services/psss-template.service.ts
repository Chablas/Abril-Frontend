import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  PsssTemplatePagedDTO,
  PsssTemplateSimpleDTO,
  PsssTemplateCreateDTO,
  PsssAllFlatDTO,
  UpdateTemplatePsssDTO,
} from '../dtos/psss-template.model';

@Injectable({ providedIn: 'root' })
export class PsssTemplateService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/psss-template`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getTemplatesPaged(page: number): Observable<PsssTemplatePagedDTO> {
    return this.http.get<PsssTemplatePagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: this.authHeaders(),
    });
  }

  getAllTemplates(): Observable<PsssTemplateSimpleDTO[]> {
    return this.http.get<PsssTemplateSimpleDTO[]>(`${this.apiUrl}/all`, {
      headers: this.authHeaders(),
    });
  }

  getAllPsssFlat(): Observable<PsssAllFlatDTO[]> {
    return this.http.get<PsssAllFlatDTO[]>(`${this.apiUrl}/all-psss-flat`, {
      headers: this.authHeaders(),
    });
  }

  createTemplate(dto: PsssTemplateCreateDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteTemplate(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.authHeaders(),
    });
  }

  getTemplatePsssIds(id: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${id}/psss-ids`, {
      headers: this.authHeaders(),
    });
  }

  updateTemplatePsss(id: number, dto: UpdateTemplatePsssDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/psss`, dto, {
      headers: this.authHeaders(),
    });
  }
}
