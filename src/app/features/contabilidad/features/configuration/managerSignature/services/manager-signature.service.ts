import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ManagerSignatureDto } from '../dtos/manager-signature.dto';

@Injectable({ providedIn: 'root' })
export class ManagerSignatureService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ManagerSignature`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Firma única configurada (null si aún no se configuró). */
  getSingleton(): Observable<ManagerSignatureDto | null> {
    return this.http.get<ManagerSignatureDto | null>(this.apiUrl, { headers: this.headers });
  }

  /** Guarda/actualiza la firma (data URL PNG del canvas). */
  save(imageBase64: string): Observable<ManagerSignatureDto> {
    return this.http.put<ManagerSignatureDto>(this.apiUrl, { imageBase64 }, { headers: this.headers });
  }
}
