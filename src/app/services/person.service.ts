import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReniecPersonDTO } from "../models/personRENIEC.model";

@Injectable({
  providedIn: 'root'
})
export class PersonService {

  private readonly apiUrl = 'http://localhost:5236/api/v1/person';

  constructor(private http: HttpClient) {}

  getPersonRENIEC(documentNumber: string): Observable<ReniecPersonDTO> {
    return this.http.get<ReniecPersonDTO>(`${this.apiUrl}/reniec/${documentNumber}`);
  }
}