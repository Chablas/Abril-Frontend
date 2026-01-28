import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequestDTO  } from "../models/auth/login-request.model";
import { LoginResponseDTO   } from "../models/auth/login-response.model";
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly api = `${environment.apiUrl}api/v1/user`;
  private readonly apiUrl = `${environment.apiUrl}api/v1/auth`;

  constructor(private http: HttpClient) { }

  completeRegistration(data: { token: string; password: string | null | undefined }) {
    return this.http.post(`${this.api}/complete-registration`, data);
  }

  login(data: LoginRequestDTO) {
    return this.http.post<LoginResponseDTO>(`${this.apiUrl}/login`, data).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('user', JSON.stringify(res.user));
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
}