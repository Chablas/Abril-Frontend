import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MilestoneScheduleGetDTO } from "../models/milestoneSchedule/milestoneSchedule.model";

@Injectable({
  providedIn: 'root',
})
export class MilestoneScheduleService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/milestoneSchedule`;

  constructor(private http: HttpClient) {}

  getAllMilestoneSchedule(): Observable<MilestoneScheduleGetDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<MilestoneScheduleGetDTO[]>(`${this.apiUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getByMilestoneScheduleHistoryId(filters: any): Observable<MilestoneScheduleGetDTO[]> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<MilestoneScheduleGetDTO[]>(`${this.apiUrl}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
