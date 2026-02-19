import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, CommonModule } from "@angular/common";
import { MilestoneScheduleService } from '../../../../services/milestoneSchedule.service';
import { ScheduleService } from '../../../../services/schedule.service';
import { HttpErrorResponse, HttpParameterCodec } from '@angular/common/http';
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
import { MilestoneScheduleHistoryService } from '../../../../services/milestoneScheduleHistory.service';
import { MilestoneScheduleHistoryGetDTO } from "../../../../models/milestoneScheduleHistory/milestoneScheduleHistory.model";
import { MilestoneScheduleGetDTO } from "../../../../models/milestoneSchedule/milestoneSchedule.model";
import { MilestoneScheduleCreateDTO } from "../../../../models/milestoneSchedule/milestoneScheduleCreate.model";
import { MilestoneService } from '../../../../services/milestone.service';
import { MilestoneScheduleHistoryCreateDTO } from "../../../../models/milestoneScheduleHistory/milestoneScheduleHistoryCreate.model";

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
  showMilestoneScheduleHistory: boolean = false;
  showDetailModal: boolean = false;
  showMilestoneSchedule: boolean = false;
  showEditButton: boolean = false;
  showCreateMilestoneScheduleModal: boolean = false;
  showEditModal: boolean = false;

  formdata: ScheduleFormData = {
    projects: [],
  };

  @ViewChild('ganttContainer', { static: false })
  ganttContainer?: ElementRef;

  filtersCreate: MilestoneScheduleFiltersDTO = {
    milestones: [],
  };

  milestoneOptions: [] = [];
  selectedTask: any;

  private mouseDownOnBackdrop = false;

  schedules: PagedResponseDTO<ScheduleGetDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  milestoneScheduleHistoryTableData: MilestoneScheduleHistoryGetDTO[] = [];
  milestoneScheduleTableData: MilestoneScheduleGetDTO[] = [];

  createDto: ScheduleCreateDTO = {
    scheduleDescription: '',
    projectId: 0,
    active: true,
  };
  addMilestoneScheduleItem = {
    milestoneId: 0,
    milestoneDescription: '',
    plannedStartDate: '',
    plannedEndDate: null,
  };

  filtersScheduleId = {
    scheduleId: null as number | null,
  };
  filtersMilestoneScheduleHistoryId = {
    milestoneScheduleHistoryId: null as number | null,
  };
  milestones: MilestoneGetDTO[] = [];
  milestoneScheduleHistoryCreateDTO: MilestoneScheduleHistoryCreateDTO = {
    scheduleId: 0,
    milestoneSchedules: [],
  };
  editMilestoneScheduleItem = {
    id: 0,
    milestoneId: 0,
    text: '',
    plannedStartDate: '',
    plannedEndDate: '' as string | null,
  };

  constructor(
    private milestoneScheduleService: MilestoneScheduleService,
    private scheduleService: ScheduleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private milestoneScheduleHistoryService: MilestoneScheduleHistoryService,
    private milestoneService: MilestoneService,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

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
      },
    });
  }

  openMilestoneScheduleHistory(scheduleId: number) {
    this.showMilestoneScheduleHistory = true;
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersScheduleId.scheduleId = scheduleId;
    this.milestoneScheduleHistoryService
      .getAllMilestoneScheduleHistory(this.filtersScheduleId)
      .subscribe({
        next: (response) => {
          this.milestoneScheduleHistoryTableData = response;
          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  openViewMilestoneSchedule(milestoneScheduleHistoryId: number) {
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId = milestoneScheduleHistoryId;
    this.milestoneScheduleService
      .getByMilestoneScheduleHistoryId(this.filtersMilestoneScheduleHistoryId)
      .pipe(
        map((items) =>
          items
            .filter((m) => m.active)
            .map((m) => ({
              id: m.milestoneScheduleId,
              text: m.milestoneDescription,
              start_date: new Date(m.plannedStartDate),
              ...(m.plannedEndDate
                ? { end_date: new Date(m.plannedEndDate) }
                : { type: 'milestone', duration: 0 }),
            })),
        ),
      )
      .subscribe({
        next: (data) => {
          this.showMilestoneScheduleHistory = false;
          this.showMilestoneSchedule = true;

          this.cdr.detectChanges();

          this.initGantt(true);
          gantt.parse({ data, links: [] });

          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  openCreateMilestoneSchedule() {
    this.loader = true;
    this.cdr.detectChanges();
    if (this.milestoneScheduleHistoryTableData.length > 0) {
      this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId =
        this.milestoneScheduleHistoryTableData[0].milestoneScheduleHistoryId;
      this.milestoneScheduleService
        .getByMilestoneScheduleHistoryId(this.filtersMilestoneScheduleHistoryId)
        .pipe(
          map((items) =>
            items
              .filter((m) => m.active)
              .map((m) => ({
                id: m.milestoneId,
                milestoneId: m.milestoneId,
                text: m.milestoneDescription,
                start_date: new Date(m.plannedStartDate),
                order: m.order,
                ...(m.plannedEndDate
                  ? { end_date: new Date(m.plannedEndDate) }
                  : { type: 'milestone', duration: 0 }),
              })),
          ),
        )
        .subscribe({
          next: (data) => {
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = [];

            data.forEach((task: any) => {
              this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
                milestoneId: task.milestoneId,
                milestoneScheduleHistoryId:
                  this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId!,
                plannedStartDate: task.start_date,
                plannedEndDate: task.end_date ?? null,
                order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
              });
            });
            this.milestoneScheduleHistoryCreateDTO.scheduleId =
              this.filtersScheduleId.scheduleId ?? 0;
            this.cdr.detectChanges();
            this.initGantt(false);
            gantt.parse({ data, links: [] });
            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.milestoneScheduleService.getFakeData().pipe(
          map((items) =>
            items
              .map((m) => ({
                id: m.milestoneId,
                milestoneId: m.milestoneId,
                text: m.milestoneDescription,
                start_date: new Date(m.plannedStartDate),
                order: m.order,
                ...(m.plannedEndDate
                  ? { end_date: new Date(m.plannedEndDate) }
                  : { type: 'milestone', duration: 0 }),
              })),
          ),
        )
        .subscribe({
          next: (data) => {
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = [];

            data.forEach((task: any) => {
              this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
                milestoneId: task.milestoneId,
                milestoneScheduleHistoryId:
                  this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId!,
                plannedStartDate: task.start_date,
                plannedEndDate: task.end_date ?? null,
                order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
              });
            });
            this.milestoneScheduleHistoryCreateDTO.scheduleId =
              this.filtersScheduleId.scheduleId ?? 0;
            this.cdr.detectChanges();
            this.initGantt(false);
            gantt.parse({ data, links: [] });
            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
        });
    }
  }

  openCreateMilestoneScheduleModal() {
    this.loader = true;
    this.cdr.detectChanges();
    this.showCreateMilestoneScheduleModal = true;
    this.milestoneService.getAllMilestone().subscribe({
      next: (response) => {
        this.milestones = response;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  addMilestoneSchedule() {
    const milestoneId = this.addMilestoneScheduleItem.milestoneId;

    const exists = gantt.getTaskByTime().some((task: any) => task.milestoneId === milestoneId);

    if (exists) {
      Swal.fire({
        icon: 'warning',
        title: 'Hito duplicado',
        text: 'Este hito ya fue agregado al cronograma.',
      });
      return;
    }

    const id = Date.now();

    const selectedMilestone = this.milestones.find((m) => m.milestoneId === milestoneId);

    const text = selectedMilestone?.milestoneDescription ?? 'Hito';

    const startDate = this.parseLocalDate(this.addMilestoneScheduleItem.plannedStartDate);
    let endDate = undefined;
    if (this.addMilestoneScheduleItem.plannedEndDate != null) {
      endDate = this.parseLocalDate(this.addMilestoneScheduleItem.plannedEndDate);
    }

    gantt.addTask({
      id: milestoneId,
      text,
      milestoneId,
      start_date: startDate,
      end_date: endDate,
      type: endDate ? undefined : 'milestone',
      duration: endDate ? null : 0,
      order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
    });

    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
      milestoneId,
      milestoneScheduleHistoryId:
        this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId!,
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
    });

    this.addMilestoneScheduleItem = {
      milestoneId: 0,
      milestoneDescription: '',
      plannedStartDate: '',
      plannedEndDate: null,
    };

    this.showCreateMilestoneScheduleModal = false;
    gantt.render();
    this.cdr.detectChanges();
  }

  private parseLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  addMilestoneScheduleOnMilestoneScheduleHistory() {
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleHistoryService
      .createMilestoneScheduleHistory(this.milestoneScheduleHistoryCreateDTO)
      .subscribe({
        next: (response) => {
          Swal.fire({
            title: response.message ?? 'Cronograma creado exitosamente',
            icon: 'success',
            draggable: true,
          });
          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  saveSchedule() {
    if (!this.createDto.scheduleDescription.trim()) {
      return;
    }
    this.loader = true;

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

  ngAfterViewInit(): void {
    gantt.i18n.setLocale('es');

    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: 'Sem %W' },
    ];

    gantt.attachEvent('onTaskClick', (id, e) => {
      const target = (e?.target as HTMLElement) || null;

      if (target?.closest('.delete-task')) {
        this.deleteTask(Number(id));
        return false;
      }

      if (target?.closest('.edit-task')) {
        this.editTask(Number(id));
        return false;
      }

      const task = gantt.getTask(id);
      this.openTaskDetail(task);
      return false;
    });

    gantt.attachEvent('onRowDragEnd', (id: number, target: number) => {
      const movedTask = gantt.getTask(id);// borrar despues

      console.log('Task movido:', movedTask);
      console.log('Nuevo índice destino:', target);

      const orderedIds: number[] = [];

      gantt.eachTask((task: any) => {
        orderedIds.push(task.id);
      });

      console.log('Nuevo orden completo:', orderedIds);

      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.forEach((item) => {
        const newOrder = orderedIds.indexOf(item.milestoneId) + 1;

        if (newOrder > 0) {
          item.order = newOrder;
        }
      });
      //dto a enviar
      console.table(this.milestoneScheduleHistoryCreateDTO.milestoneSchedules);
    });
  }

  private initGantt(readonly: boolean) {
    if (!this.ganttContainer) return;

    this.destroyGantt();

    gantt.config.readonly = readonly;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config['drag_tree'] = !readonly;
    gantt.config.order_branch = true;
    gantt.config.show_links = false;

    const columns: any[] = [];

    if (!readonly) {
      columns.push({
        name: 'edit',
        label: '',
        width: 40,
        align: 'center',
        template: (task: any) => {
          return `<div class="flex align-center"><button class="cursor-pointer edit-task" data-id="${task.id}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.06 9L15 9.94L5.92 19H5V18.08L14.06 9ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"
                        fill="#64BC04" />
                    </svg>
                  </button></div>`;
        },
      });
    }

    if (!readonly) {
      columns.push({
        name: 'delete',
        label: '',
        width: 40,
        align: 'center',
        template: (task: any) => {
          return `<button class="cursor-pointer delete-task" data-id="${task.id}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 21C6.45 21 5.97933 20.8043 5.588 20.413C5.19667 20.0217 5.00067 19.5507 5 19V6H4V4H9V3H15V4H20V6H19V19C19 19.55 18.8043 20.021 18.413 20.413C18.0217 20.805 17.5507 21.0007 17 21H7ZM17 6H7V19H17V6ZM9 17H11V8H9V17ZM13 17H15V8H13V17Z"
                        fill="#64BC04" />
                    </svg>
                  </button>`;
        },
      });
    }

    columns.push(
      {
        name: 'text',
        label: 'Hito',
        tree: true,
        width: '*',
        min_width: 150,
      },
      {
        name: 'start_date',
        label: 'Inicio',
        align: 'center',
        width: 90,
        template: (task: any) => gantt.date.date_to_str('%d-%m-%y')(task.start_date),
      },
      {
        name: 'end_date',
        label: 'Fin',
        align: 'center',
        width: 90,
        template: (task: any) => {
          if (task.type === 'milestone') return '-';
          if (!task.end_date) return '-';
          return gantt.date.date_to_str('%d-%m-%y')(task.end_date);
        },
      },
    );

    gantt.config.columns = columns;

    gantt.templates.task_class = (start, end, task) =>
      task.type === 'milestone' ? 'custom-milestone' : 'custom-task';
    gantt.templates.task_text = () => '';
    gantt.init(this.ganttContainer.nativeElement);
  }

  private deleteTask(taskId: number) {
    const task = gantt.getTask(taskId);

    Swal.fire({
      title: '¿Eliminar hito?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      gantt.deleteTask(taskId);

      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules =
        this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.filter(
          (item) => item.milestoneId !== task['milestoneId'],
        );

      this.recalculateOrder();

      console.log('DTO actualizado:', this.milestoneScheduleHistoryCreateDTO);
    });
  }

  private editTask(taskId: number) {
    const task = gantt.getTask(taskId);
    this.editMilestoneScheduleItem = {
      id: Number(task.id),
      milestoneId: task['milestoneId'],
      text: task.text,
      plannedStartDate: task.start_date ? this.formatDate(task.start_date) : '',
      plannedEndDate:
        task.type == 'milestone' ? null : task.end_date ? this.formatDate(task.end_date) : null,
    };
    this.showEditModal = true;
  }

  private formatDate(date: Date): string {
    return date.toISOString().substring(0, 10);
  }

  private recalculateOrder() {
    const orderedMilestoneIds: number[] = [];

    gantt.eachTask((task: any) => {
      orderedMilestoneIds.push(task.milestoneId);
    });

    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.forEach((item) => {
      const newOrder = orderedMilestoneIds.indexOf(item.milestoneId) + 1;
      if (newOrder > 0) item.order = newOrder;
    });
  }

  private destroyGantt() {
    gantt.clearAll();
  }

  saveEditTask() {
    const item = this.editMilestoneScheduleItem;
    const task = gantt.getTask(item.id);

    task.text = item.text;

    task.start_date = this.parseLocalDate(item.plannedStartDate);
    task.end_date = undefined;
    if (this.editMilestoneScheduleItem.plannedEndDate != null) {
      task.end_date = this.parseLocalDate(this.editMilestoneScheduleItem.plannedEndDate);
    }
    task.type = item.plannedEndDate ? undefined : 'milestone';
    task.duration = item.plannedEndDate ? undefined : 0;

    gantt.updateTask(task.id);
    gantt.render();

    this.showEditModal = false;
    this.cdr.detectChanges();

    const dtoItem = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.find(
      (x) => x.order === task['order'],
    );

    if (dtoItem) {
      dtoItem.plannedStartDate = task.start_date;
      task.type == "milestone" ? dtoItem.plannedEndDate = null : dtoItem.plannedEndDate = task.end_date;
      console.log(task.end_date);
      console.log(dtoItem.plannedEndDate);
    }
    
  }

  ngOnDestroy(): void {
    gantt.clearAll();
  }

  openTaskDetail(task: any): void {
    this.selectedTask = task;
    this.showDetailModal = true;
    if (task.type === 'milestone') {
      this.selectedTask.end_date = '-';
    }
    this.cdr.detectChanges();
  }

  onBackdropMouseDown(event: MouseEvent) {
    this.mouseDownOnBackdrop = event.target === event.currentTarget;
  }

  closeModal(event: MouseEvent) {
    const mouseUpOnBackdrop = event.target === event.currentTarget;

    if (this.mouseDownOnBackdrop && mouseUpOnBackdrop) {
      this.showDetailModal = false;
      this.showCreateModal = false;
      this.showMilestoneScheduleHistory = false;
      this.showCreateMilestoneScheduleModal = false;
      this.showEditModal = false;
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
