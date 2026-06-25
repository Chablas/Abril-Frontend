import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import {
  InvoiceFolderDto,
  InvoiceFolderCreateDto,
  InvoiceFolderUpdateDto,
  InvoiceFolderFilterDto,
} from '../dtos/invoice-folder.dto';
import { FolderBrowseDto, FolderItemDto } from '../dtos/folder-browse.dto';

@Injectable({ providedIn: 'root' })
export class InvoiceFolderService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/InvoiceFolder`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: InvoiceFolderFilterDto): Observable<PagedResponseDTO<InvoiceFolderDto>> {
    const params = new HttpParams().set('page', filters.page.toString());
    return this.http.get<PagedResponseDTO<InvoiceFolderDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  /** Valida el link (tenant) y devuelve la carpeta resuelta + sus subcarpetas. */
  resolveLink(linkUrl: string): Observable<FolderBrowseDto> {
    return this.http.post<FolderBrowseDto>(`${this.apiUrl}/resolve-link`, { linkUrl }, { headers: this.headers });
  }

  /** Lista las subcarpetas de una carpeta (navegación). */
  getFolders(driveId: string, folderId: string): Observable<FolderItemDto[]> {
    const params = new HttpParams().set('driveId', driveId).set('folderId', folderId);
    return this.http.get<FolderItemDto[]>(`${this.apiUrl}/folders`, { headers: this.headers, params });
  }

  create(dto: InvoiceFolderCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  update(dto: InvoiceFolderUpdateDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(invoiceFolderId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${invoiceFolderId}`, {
      headers: this.headers,
    });
  }
}
