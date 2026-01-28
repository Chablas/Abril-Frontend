import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubStagePagedDTO } from '../models/subStagePaged.model';
import { SubStageCreateDTO } from "../models/subStageCreate.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubStageService {

  private readonly apiUrl = `${environment.apiUrl}api/v1/substage`;

  constructor(private http: HttpClient) {}

  getSubStagePaged(page: number): Observable<SubStagePagedDTO> {
    return this.http.get<SubStagePagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createSubStage(dto: SubStageCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deleteSubStage(subStageId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${subStageId}`);
  }
}