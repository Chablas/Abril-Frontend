import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { LessonReminderService } from '../../services/lesson-reminder.service';
import { JefeReminderConfigItemDTO } from '../../dtos/jefeReminder.model';

@Component({
  selector: 'app-jefe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadge, SearchSelect],
  templateUrl: './jefe-list.html',
})
export class JefeList implements OnInit {
  rows: JefeReminderConfigItemDTO[] = [];
  searchText = '';
  /** Filtro por categoría: null = todas | 'Jefe' | 'Coordinador' | 'Residente'. */
  categoryFilter: string | null = null;

  /** Opciones del desplegable de categoría (search-select). */
  readonly categoryOptions = [
    { value: 'Jefe', label: 'Jefe' },
    { value: 'Coordinador', label: 'Coordinador' },
    { value: 'Residente', label: 'Residente' },
  ];

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getJefes().subscribe({
      next: (data) => {
        this.rows = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(item: JefeReminderConfigItemDTO): void {
    this.loaderService.show();
    this.service.toggleJefe(item.workerId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.active = res.active;
        item.lessonJefeReminderId = res.lessonJefeReminderId;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRows(): JefeReminderConfigItemDTO[] {
    const term = this.searchText.trim().toLowerCase();
    return this.rows.filter((r) => {
      const matchesName = !term || (r.fullName ?? '').toLowerCase().includes(term);
      const matchesCategory = !this.categoryFilter || r.categoria === this.categoryFilter;
      return matchesName && matchesCategory;
    });
  }

  /** true si hay algún filtro aplicado (para el mensaje de tabla vacía). */
  get hasActiveFilter(): boolean {
    return !!this.searchText.trim() || !!this.categoryFilter;
  }
}
