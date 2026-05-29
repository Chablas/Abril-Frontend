import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { LessonReminderPagedDTO } from '../dtos/lessonReminder.model';
import { LessonReminderCreateDTO } from '../dtos/lessonReminderCreate.model';
import { LessonReminderCreateDataDTO } from '../dtos/lessonReminderCreateData.model';
import {
  ProjectStaffReminderConfigItemDTO,
  ToggleProjectStaffReminderResultDTO,
} from '../dtos/projectStaffReminder.model';

@Injectable({ providedIn: 'root' })
export class LessonReminderService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson-reminder`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(page: number, pageSize: number = 10): Observable<LessonReminderPagedDTO> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<LessonReminderPagedDTO>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getCreateData(): Observable<LessonReminderCreateDataDTO> {
    return this.http.get<LessonReminderCreateDataDTO>(`${this.apiUrl}/create-data`, {
      headers: this.authHeaders(),
    });
  }

  create(dto: LessonReminderCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  delete(userProjectId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${userProjectId}`, {
      headers: this.authHeaders(),
    });
  }

  // Filtro de project_staff_reminder (toggle por proyecto con staff_email)
  getProjectStaff(): Observable<ProjectStaffReminderConfigItemDTO[]> {
    return this.http.get<ProjectStaffReminderConfigItemDTO[]>(`${this.apiUrl}/project-staff`, {
      headers: this.authHeaders(),
    });
  }

  toggleProjectStaff(projectId: number): Observable<ToggleProjectStaffReminderResultDTO> {
    return this.http.put<ToggleProjectStaffReminderResultDTO>(
      `${this.apiUrl}/project-staff/toggle/${projectId}`,
      {},
      { headers: this.authHeaders() },
    );
  }
}
