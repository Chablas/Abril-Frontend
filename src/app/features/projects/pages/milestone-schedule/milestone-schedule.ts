import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe, CommonModule } from "@angular/common";
import { MilestoneScheduleService } from '../../../../services/milestoneSchedule.service';
import { ScheduleService } from '../../../../services/schedule.service';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';
import { gantt } from 'dhtmlx-gantt';
import Swal from 'sweetalert2';
import { Router } from "@angular/router";
import { PagedResponseDTO } from '../../../../models/api/pagedResponse.model';
import { MilestoneGetDTO } from '../../../../models/milestone/milestone.model';
import { MilestoneScheduleFiltersDTO } from "../../../../models/milestone/milestone-schedule-filters.model";
import { ScheduleGetDTO } from '../../../../models/schedule/schedule.model';
import { ScheduleCreateDTO } from '../../../../models/schedule/scheduleCreate.model';
import { FormsModule } from "@angular/forms";
import { ApiMessageDTO } from "../../../../models/api/ApiMessage.model";
import { ScheduleFormData } from "../../../../models/schedule/scheduleFormData.model";

@Component({
  selector: 'app-milestone-schedule',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './milestone-schedule.html',
  styleUrl: './milestone-schedule.css',
})
export class MilestoneSchedule implements OnInit, AfterViewInit, OnDestroy {
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader: boolean = false;
  showCreateModal: boolean = false;
  formdata: ScheduleFormData = {
    projects: []
  }

  @ViewChild('ganttContainer', { static: true })
  ganttContainer!: ElementRef;

  filtersCreate: MilestoneScheduleFiltersDTO = {
    milestones: [],
  };
  milestoneOptions: [] = [];
  selectedTask: any;
  private mouseDownOnBackdrop = false;
  showDetailModal: boolean = false;
  showMilestoneScheduleHistory: boolean = false;

  showMilestoneSchedule: boolean = false;

  schedules: PagedResponseDTO<ScheduleGetDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: ScheduleCreateDTO = {
    scheduleDescription: '',
    projectId: 0,
    active: true,
  };

  constructor(
    private milestoneScheduleService: MilestoneScheduleService,
    private scheduleService: ScheduleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(page: number = 1): void {
    this.loader = true;
    this.cdr.detectChanges();
    this.scheduleService.getSchedulePaged(page).subscribe({
      next: (response) => {
        this.schedules = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.loader = true;
    this.cdr.detectChanges();
    this.scheduleService.getFormData().subscribe({
      next: (response) => {
        this.formdata = response;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      }
    })
  }

  openMilestoneScheduleHistory() {
    this.showMilestoneScheduleHistory = true;
  }

  openMilestoneSchedule() {
    this.showMilestoneScheduleHistory = false;
    this.showMilestoneSchedule = !this.showMilestoneSchedule;
  }

  saveSchedule() {
    if (!this.createDto.scheduleDescription.trim()) {
      return;
    }
    this.loader = true;
    console.log(this.createDto);
    this.scheduleService.createSchedule(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { scheduleDescription: '', projectId: 0, active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSchedules();
        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  loadGanttData(): void {
    this.loader = true;

    this.milestoneScheduleService
      .getAllMilestoneSchedule()
      .pipe(
        map((items) =>
          items
            .filter((m) => m.active)
            .map((m) => ({
              id: m.milestoneScheduleId,
              text: m.milestoneDescription,
              start_date: new Date(m.plannedStartDate),
              ...(m.plannedEndDate && { end_date: new Date(m.plannedEndDate) }),
              type: m.plannedEndDate ? undefined : 'milestone',
            })),
        ),
      )
      .subscribe({
        next: (data) => {
          gantt.clearAll();
          gantt.parse({ data, links: [] });
          this.loader = false;
        },
        error: (err: HttpErrorResponse) => this.error(err),
      });
  }

  ngAfterViewInit(): void {
    gantt.i18n.setLocale('es');

    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: 'Sem %W' },
    ];

    gantt.config.readonly = true;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;

    gantt.attachEvent('onTaskClick', (id, e) => {
      const task = gantt.getTask(id);

      this.openTaskDetail(task);

      return false; // evita comportamiento por defecto
    });

    gantt.init(this.ganttContainer.nativeElement);

    this.loadGanttData();
  }

  ngOnDestroy(): void {
    gantt.clearAll();
  }

  openTaskDetail(task: any): void {
    this.selectedTask = task;
    this.showDetailModal = true;
    console.log('gaaaaaaaaaa');
    this.cdr.detectChanges();
  }

  onBackdropMouseDown(event: MouseEvent) {
    // true solo si empieza en el backdrop
    this.mouseDownOnBackdrop = event.target === event.currentTarget;
  }

  closeModal(event: MouseEvent) {
    const mouseUpOnBackdrop = event.target === event.currentTarget;

    // cerrar solo si empezó y terminó en backdrop
    if (this.mouseDownOnBackdrop && mouseUpOnBackdrop) {
      this.showDetailModal = false;
      this.showCreateModal = false;
      this.showMilestoneScheduleHistory = false;
    }

    this.mouseDownOnBackdrop = false;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadSchedules(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadSchedules(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSchedules(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
