import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubSpecialtyPagedDTO } from '../models/subSpecialtyPaged.model';
import { SubSpecialtyCreateDTO } from "../models/subSpecialtyCreate.model";

@Injectable({
  providedIn: 'root'
})
export class SubSpecialtyService {

  private readonly apiUrl = 'http://localhost:5236/api/v1/subspecialty';

  constructor(private http: HttpClient) {}

  getSubSpecialtyPaged(page: number): Observable<SubSpecialtyPagedDTO> {
    return this.http.get<SubSpecialtyPagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createSubSpecialty(dto: SubSpecialtyCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
}