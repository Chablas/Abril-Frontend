import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StagePagedDTO } from '../models/stagePaged.model';
import { StageCreateDTO } from "../models/stageCreate.model"

@Injectable({
  providedIn: 'root'
})
export class StageService {

  private readonly apiUrl = 'http://localhost:5236/api/v1/stage';

  constructor(private http: HttpClient) {}

  getStagePaged(page: number): Observable<StagePagedDTO> {
    return this.http.get<StagePagedDTO>(`${this.apiUrl}/paged?page=${page}`);
  }
  createStage(dto: StageCreateDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto);
  }
  deleteStage(stageId: number, updatedUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${stageId}`);
  }
}