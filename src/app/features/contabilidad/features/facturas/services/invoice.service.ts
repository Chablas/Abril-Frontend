import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import {
  InvoiceInitDto,
  InvoiceFilterDto,
  InvoiceSupplierCreateDto,
  InvoiceSupplierDto,
  PagedResponseDTO,
  InvoiceDto,
  SunatContributorDTO,
} from '../dtos/invoice.dtos';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/invoice`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  private buildParams(filter: InvoiceFilterDto): HttpParams {
    let params = new HttpParams().set('page', filter.page.toString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.contributorId) params = params.set('contributorId', filter.contributorId.toString());
    return params;
  }

  /** Carga inicial: desplegables + primera página de la tabla en una sola petición. */
  getInit(filter: InvoiceFilterDto): Observable<InvoiceInitDto> {
    return this.http.get<InvoiceInitDto>(`${this.apiUrl}/init`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  /** Solo la tabla filtrada (sin volver a traer los datos de los desplegables). */
  getPaged(filter: InvoiceFilterDto): Observable<PagedResponseDTO<InvoiceDto>> {
    return this.http.get<PagedResponseDTO<InvoiceDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  create(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, formData, { headers: this.headers });
  }

  getByRuc(ruc: string): Observable<SunatContributorDTO> {
    return this.http.get<SunatContributorDTO>(`${this.apiUrl}/ruc/${ruc}`, { headers: this.headers });
  }

  createSupplier(dto: InvoiceSupplierCreateDto): Observable<InvoiceSupplierDto> {
    return this.http.post<InvoiceSupplierDto>(`${this.apiUrl}/supplier`, dto, { headers: this.headers });
  }
}
