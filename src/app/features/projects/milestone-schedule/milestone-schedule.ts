import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { MilestoneScheduleService } from '../../../core/services/milestoneSchedule.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { gantt } from 'dhtmlx-gantt';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { MilestoneGetDTO } from '../../../core/dtos/milestone/milestone.model';
import { MilestoneScheduleFiltersDTO } from '../../../core/dtos/milestone/milestone-schedule-filters.model';
import { ScheduleCreateDTO } from '../../../core/dtos/schedule/scheduleCreate.model';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../core/dtos/api/ApiMessage.model';
import { ScheduleFormData } from '../../../core/dtos/schedule/scheduleFormData.model';
import { MilestoneScheduleHistoryService } from '../../../core/services/milestoneScheduleHistory.service';
import { MilestoneScheduleHistoryGetDTO } from '../../../core/dtos/milestoneScheduleHistory/milestoneScheduleHistory.model';
import { MilestoneScheduleGetDTO } from '../../../core/dtos/milestoneSchedule/milestoneSchedule.model';
import { MilestoneService } from '../../../core/services/milestone.service';
import { MilestoneScheduleHistoryCreateDTO } from '../../../core/dtos/milestoneScheduleHistory/milestoneScheduleHistoryCreate.model';
import { AuthService } from '../../../core/services/auth.service';
import { MilestoneScheduleProjectsService } from './services/milestone-schedule-projects.service';
import { ProjectGetDTO } from '../../../core/dtos/project/project.model';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-milestone-schedule',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, BaseModal, AbrilPageHeaderComponent],
  templateUrl: './milestone-schedule.html',
  styleUrl: './milestone-schedule.css',
})
export class MilestoneSchedule implements OnInit, AfterViewInit, OnDestroy {
  anioActual = new Date().getFullYear();

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader: boolean = false;
  showMilestoneSchedule: boolean = false;
  showEditButton: boolean = false;
  noMilestones: boolean = false;
  selectedProjectName: string = '';

  // Modal flags como getter/setter para sincronizar visibilidad de la línea "Hoy"
  private _showCreateModal = false;
  get showCreateModal() { return this._showCreateModal; }
  set showCreateModal(v: boolean) { this._showCreateModal = v; this.updateTodayLineVisibility(); }

  private _showMilestoneScheduleHistory = false;
  get showMilestoneScheduleHistory() { return this._showMilestoneScheduleHistory; }
  set showMilestoneScheduleHistory(v: boolean) { this._showMilestoneScheduleHistory = v; this.updateTodayLineVisibility(); }

  private _showDetailModal = false;
  get showDetailModal() { return this._showDetailModal; }
  set showDetailModal(v: boolean) { this._showDetailModal = v; this.updateTodayLineVisibility(); }

  private _showCreateMilestoneScheduleModal = false;
  get showCreateMilestoneScheduleModal() { return this._showCreateMilestoneScheduleModal; }
  set showCreateMilestoneScheduleModal(v: boolean) { this._showCreateMilestoneScheduleModal = v; this.updateTodayLineVisibility(); }

  private _showEditModal = false;
  get showEditModal() { return this._showEditModal; }
  set showEditModal(v: boolean) { this._showEditModal = v; this.updateTodayLineVisibility(); }

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
  searchQuery: string = '';
  projectImages: Record<number, string> = {};

  private mouseDownOnBackdrop = false;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  schedules: ProjectGetDTO[] = [];
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
    plannedEndDate: null as string | null,
  };

  filtersScheduleId = {
    projectId: null as number | null,
  };
  filtersMilestoneScheduleHistoryId = {
    milestoneScheduleHistoryId: null as number | null,
  };
  milestones: MilestoneGetDTO[] = [];
  milestoneScheduleHistoryCreateDTO: MilestoneScheduleHistoryCreateDTO = {
    projectId: 0,
    milestoneSchedules: [],
    forceSave: false,
  };
  ganttTasks: any[] = [];
  undatedTasks: any[] = [];
  editMilestoneScheduleItem = {
    id: 0,
    milestoneId: 0,
    text: '',
    plannedStartDate: '',
    plannedEndDate: '' as string | null,
  };

  get kpis() {
    let total = 0, culminados = 0, enProceso = 0;
    this.ganttTasks.forEach((task: any) => {
      total++;
      if (this.getEstado(task) === 'CULMINADO') culminados++;
      else enProceso++;
    });
    return { total, culminados, enProceso };
  }

  // ── Plantilla de hitos (noMilestones view) ────────────────────────────────
  busqueda = '';
  filtroActivo: 'todos' | 'sin-fecha' | 'con-fecha' = 'todos';

  tieneFecha(hito: any): boolean {
    return !!(hito.startDate || hito.endDate);
  }

  get hitosFiltrados(): any[] {
    let result = this.undatedTasks;
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      result = result.filter((t: any) => t.text.toLowerCase().includes(q));
    }
    if (this.filtroActivo === 'con-fecha') result = result.filter((t: any) =>  this.tieneFecha(t));
    if (this.filtroActivo === 'sin-fecha') result = result.filter((t: any) => !this.tieneFecha(t));
    return result;
  }

  get statConFecha(): number { return this.undatedTasks.filter((t: any) => this.tieneFecha(t)).length; }
  get statSinFecha(): number { return this.undatedTasks.length - this.statConFecha; }
  get pctConFecha(): number {
    return this.undatedTasks.length ? Math.round(this.statConFecha / this.undatedTasks.length * 100) : 0;
  }

  onFechaChange(hito: any): void {
    const startClean = hito.startDate?.substring(0, 10) || null;
    const endClean   = hito.endDate?.substring(0, 10)   || null;
    hito.startDate  = startClean ?? '';
    hito.endDate    = endClean   ?? '';
    hito.start_date = startClean ? this.parseStringToDate(startClean) : null;
    hito.end_date   = endClean   ? this.parseStringToDate(endClean)   : null;
    const idx = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules
      .findIndex((s: any) => s.milestoneId === hito.milestoneId);
    if (idx !== -1) {
      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules[idx].plannedStartDate = startClean ?? '';
      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules[idx].plannedEndDate   = endClean;
    }
  }

  getEstado(task: any): string {
    return task['fechaRealFin'] != null ? 'CULMINADO' : 'EN_PROCESO';
  }

  getEstadoClass(estado: string): string {
    return estado === 'CULMINADO' ? 'estado-culminado' : 'estado-en-proceso';
  }

  getEstadoLabel(estado: string): string {
    return estado === 'CULMINADO' ? 'Culminado' : 'En proceso';
  }

  getGanttClass(task: any): string {
    const base = task.type === 'milestone' ? 'custom-milestone' : 'custom-task';
    return this.getEstado(task) === 'CULMINADO'
      ? `${base} ms-culminado`
      : `${base} ms-en-proceso`;
  }

  get projectsFiltered(): ProjectGetDTO[] {
    return this.schedules;
  }

  getProjectColor(name: string): string {
    const colors = ['#4f46e5', '#0891b2', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0284c7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  onProjectImageChange(projectId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.milestoneScheduleProjectsService.uploadProjectFoto(projectId, file).subscribe({
      next: (res) => {
        this.projectImages[projectId] = res.fotoUrl;
        this.cdr.detectChanges();
      },
      error: (err) => this.error(err),
    });
  }

  constructor(
    private milestoneScheduleService: MilestoneScheduleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private milestoneScheduleProjectsService: MilestoneScheduleProjectsService,
    private scheduleService: ScheduleService,
    private milestoneScheduleHistoryService: MilestoneScheduleHistoryService,
    private milestoneService: MilestoneService,
    public authService: AuthService,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(page: number = 1, search?: string): void {
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleProjectsService.getProjectPagedWithResidents(page, search, 12).subscribe({
      next: (response) => {
        this.schedules = response.data ?? [];
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
        this.schedules.forEach((p) => {
          if (p.fotoUrl) this.projectImages[p.projectId] = p.fotoUrl;
        });
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadSchedules(1, this.searchQuery || undefined), 400);
  }

  /** Navega directamente al Gantt del proyecto seleccionado */
  openProjectGantt(projectId: number, projectDescription: string): void {
    this.selectedProjectName = projectDescription;
    this.filtersScheduleId.projectId = projectId;
    this.milestoneScheduleHistoryCreateDTO.projectId = projectId;
    this.loader = true;
    this.cdr.detectChanges();

    this.milestoneScheduleHistoryService
      .getAllMilestoneScheduleHistory({ projectId })
      .subscribe({
        next: (history) => {
          this.milestoneScheduleHistoryTableData = history;
          this.openCreateMilestoneSchedule();
        },
        error: (err: HttpErrorResponse) => this.error(err),
      });
  }

  backToList(): void {
    this.showMilestoneSchedule = false;
    this.showEditButton = false;
    this.noMilestones = false;
    this.selectedProjectName = '';
    this.milestoneScheduleHistoryTableData = [];
    this.ganttTasks = [];
    this.undatedTasks = [];
    this.destroyGantt();
    this.cdr.detectChanges();
  }

  openMilestoneScheduleHistory(scheduleId: number, projectDescription?: string) {
    if (projectDescription) this.selectedProjectName = projectDescription;
    this.showMilestoneScheduleHistory = true;
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersScheduleId.projectId = scheduleId;
    this.milestoneScheduleHistoryCreateDTO.projectId = scheduleId;
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

  // si se obtiene '2026-11-11' se obtendrá un Date que actúe como 11 de noviembre de 2026
  private parseStringToDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return null;

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // devuelve en formato "yyyy-mm-dd"
  private parseDateToString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  openViewMilestoneSchedule(milestoneScheduleHistoryId: number) {
    this.loader = true;
    this.showEditButton = false;
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
              start_date: this.parseStringToDate(m.plannedStartDate),
              ...(m.plannedEndDate
                ? { end_date: this.parseStringToDate(m.plannedEndDate) }
                : { type: 'milestone', duration: 0, end_date: this.parseStringToDate(m.plannedStartDate) }),
            })),
        ),
      )
      .subscribe({
        next: (data) => {
          this.noMilestones = data.length === 0;
          this.showMilestoneScheduleHistory = false;
          this.showMilestoneSchedule = true;
          this.cdr.detectChanges();

          if (!this.noMilestones) {
            this.initGantt(true);
            gantt.parse({ data, links: [] });
            gantt.showDate(new Date());
            this.ganttTasks = gantt.getTaskByTime();
            setTimeout(() => this.drawTodayLine(), 50);
          }

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
                start_date: this.parseStringToDate(m.plannedStartDate),
                order: m.order,
                ...(m.plannedEndDate
                  ? { end_date: this.parseStringToDate(m.plannedEndDate) }
                  : { type: 'milestone', duration: 0, end_date: this.parseStringToDate(m.plannedStartDate) }),
              })),
          ),
        )
        .subscribe({
          next: (data) => {
            this.noMilestones = data.length === 0;
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = [];

            data.forEach((task: any) => {
              if (task.type === 'milestone') task.end_date = null;
              this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
                milestoneId: task.milestoneId,
                plannedStartDate: this.parseDateToString(task.start_date),
                plannedEndDate:
                  task.end_date != null ? this.parseDateToString(task.end_date) : null,
                order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
              });
            });
            this.milestoneScheduleHistoryCreateDTO.projectId =
              this.filtersScheduleId.projectId ?? 0;
            this.cdr.detectChanges();

            if (!this.noMilestones) {
              this.initGantt(false);
              gantt.parse({ data, links: [] });
              gantt.showDate(new Date());
              this.ganttTasks = gantt.getTaskByTime();
              setTimeout(() => this.drawTodayLine(), 50);
            }

            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
    } else {
      this.milestoneScheduleService
        .getFakeData()
        .pipe(
          map((items) =>
            items.map((m) => ({
              id: m.milestoneId,
              milestoneId: m.milestoneId,
              text: m.milestoneDescription,
              order: m.order,
              start_date: null as Date | null,
              end_date: null as Date | null,
              type: 'milestone',
              duration: 0,
              startDate: '' as string,
              endDate: '' as string,
            })),
          ),
        )
        .subscribe({
          next: (data) => {
            // Todas las tareas de la plantilla vienen sin fecha — se gestionan fuera del Gantt
            this.undatedTasks = data;
            this.noMilestones = true;
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = [];
            data.forEach((task) => {
              this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
                milestoneId: task.milestoneId,
                plannedStartDate: '',
                plannedEndDate: null,
                order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
              });
            });
            this.milestoneScheduleHistoryCreateDTO.projectId =
              this.filtersScheduleId.projectId ?? 0;

            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
    }
  }

  editUndatedTask(task: any): void {
    this.editMilestoneScheduleItem = {
      id: task.milestoneId,
      milestoneId: task.milestoneId,
      text: task.text,
      plannedStartDate: task.startDate ?? '',
      plannedEndDate: task.endDate ?? null,
    };
    this.showEditModal = true;
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

  get addMilestoneFormValid(): boolean {
    return this.addMilestoneScheduleItem.milestoneId > 0 && !!this.addMilestoneScheduleItem.plannedStartDate;
  }

  addMilestoneSchedule() {
    const milestoneId = this.addMilestoneScheduleItem.milestoneId;

    if (!this.noMilestones) {
      const exists = gantt.getTaskByTime().some((task: any) => task.milestoneId === milestoneId);

      if (exists) {
        Swal.fire({
          icon: 'warning',
          title: 'Hito duplicado',
          text: 'Este hito ya fue agregado al cronograma.',
        });
        return;
      }
    }

    const selectedMilestone = this.milestones.find((m) => m.milestoneId === milestoneId);
    const text = selectedMilestone?.milestoneDescription ?? 'Hito';
    const startDate = this.parseStringToDate(this.addMilestoneScheduleItem.plannedStartDate);
    const endDate = !this.addMilestoneScheduleItem.plannedEndDate
      ? null
      : this.parseStringToDate(this.addMilestoneScheduleItem.plannedEndDate);
    const newOrder = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1;

    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
      milestoneId,
      plannedStartDate: this.addMilestoneScheduleItem.plannedStartDate,
      plannedEndDate: endDate ? this.addMilestoneScheduleItem.plannedEndDate : null,
      order: newOrder,
    });

    const taskData = {
      id: milestoneId,
      text,
      milestoneId,
      start_date: startDate,
      end_date: endDate ?? startDate,
      type: endDate ? undefined : 'milestone',
      duration: endDate ? null : 0,
      order: newOrder,
    };

    if (this.noMilestones) {
      this.noMilestones = false;
      this.cdr.detectChanges();
      this.initGantt(false);
      gantt.parse({ data: [taskData], links: [] });
      gantt.showDate(new Date());
    } else {
      gantt.addTask(taskData);
      gantt.render();
    }

    this.ganttTasks = gantt.getTaskByTime();

    this.addMilestoneScheduleItem = {
      milestoneId: 0,
      milestoneDescription: '',
      plannedStartDate: '',
      plannedEndDate: null,
    };

    this.showCreateMilestoneScheduleModal = false;
    this.cdr.detectChanges();
  }

  private promoteUndatedTasksToGantt(): void {
    const safeDate = (d: any): Date =>
      d instanceof Date && !isNaN(d.getTime()) ? d : new Date();

    const ganttData = this.undatedTasks.map((t) => {
      const hasDate = t.start_date instanceof Date && !isNaN(t.start_date.getTime());
      const startDate = safeDate(t.start_date);
      const endDate = t.end_date instanceof Date && !isNaN(t.end_date.getTime()) ? t.end_date : null;
      return {
        id: t.id,
        text: t.text,
        milestoneId: t.milestoneId,
        start_date: startDate,
        end_date: endDate ?? startDate,
        type: endDate ? undefined : 'milestone',
        duration: endDate ? undefined : 0,
        ...(hasDate ? {} : { sinFecha: true }),
      };
    });

    this.undatedTasks = [];

    if (this.noMilestones) {
      // Transición desde la vista de plantilla: inicializar Gantt siempre
      this.noMilestones = false;
      this.cdr.detectChanges();
      this.initGantt(false);
      if (ganttData.length > 0) {
        gantt.parse({ data: ganttData, links: [] });
        gantt.showDate(new Date());
      }
    } else {
      // Ya estamos en el Gantt: solo agregar si hay tareas pendientes
      if (ganttData.length === 0) return;
      ganttData.forEach((taskData) => gantt.addTask(taskData));
      gantt.render();
    }

    this.ganttTasks = gantt.getTaskByTime();
    setTimeout(() => this.drawTodayLine(), 50);
    this.cdr.detectChanges();
  }

  private buildSavePayload(forceSave: boolean) {
    return {
      ...this.milestoneScheduleHistoryCreateDTO,
      forceSave,
      milestoneSchedules: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.filter(
        (ms) => !!ms.plannedStartDate?.trim(),
      ),
    };
  }

  addMilestoneScheduleOnMilestoneScheduleHistory() {
    if (this.noMilestones && this.undatedTasks.length > 0) {
      // Vista de plantilla: solo transicionar al Gantt, sin llamada al backend
      this.promoteUndatedTasksToGantt();
      return;
    }

    this.promoteUndatedTasksToGantt();
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleHistoryService
      .createMilestoneScheduleHistory(this.buildSavePayload(false))
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

  forceAddMilestoneScheduleOnMilestoneScheduleHistory() {
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleHistoryService
      .createMilestoneScheduleHistory(this.buildSavePayload(true))
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
      { unit: 'day', step: 1, format: '%d' },
    ];

    gantt.attachEvent('onTaskClick', (id, e) => {
      const target = (e?.target as HTMLElement) || null;

      if (target?.closest('.delete-task')) {
        this.deleteTask(Number(id));
        return false;
      }

      if (target?.closest('.culminar-task')) {
        this.toggleCulminar(Number(id));
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

    gantt.attachEvent('onRowDragEnd', () => {
      const orderedIds: number[] = [];

      gantt.eachTask((task: any) => {
        orderedIds.push(task.id);
      });

      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.forEach((item) => {
        const newOrder = orderedIds.indexOf(item.milestoneId) + 1;

        if (newOrder > 0) {
          item.order = newOrder;
        }
      });
    });
  }

  private initGantt(readonly: boolean) {
    if (!this.ganttContainer) return;

    this.destroyGantt();

    (gantt.config as any).csp = false;
    gantt.config.readonly = readonly;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config['drag_tree'] = !readonly;
    gantt.config.order_branch = true;
    gantt.config.show_links = false;
    gantt.config.row_height = 28;
    gantt.config.bar_height = 16;
    gantt.config['milestone_height'] = 16;
    gantt.config.scale_height = 44;

    const columns: any[] = [];

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
      {
        name: 'estado',
        label: 'Estado',
        align: 'center',
        width: 100,
        template: (task: any) => {
          const estado = this.getEstado(task);
          return `<span class="estado-badge ${this.getEstadoClass(estado)}">${this.getEstadoLabel(estado)}</span>`;
        },
      },
    );

    gantt.config.columns = columns;
    gantt.config.grid_width = 420;
    gantt.config.scroll_size = 20;
    gantt.config.min_column_width = 16;

    gantt.templates.task_class = (_start: any, _end: any, task: any) => {
      const estadoClass = this.getGanttClass(task);
      if (task.type === 'milestone') return `gantt_milestone ${estadoClass}`;
      return estadoClass;
    };
    gantt.templates.task_text = () => '';
    gantt.templates.tooltip_text = (start: any, end: any, task: any) => {
      const fmt = gantt.date.date_to_str('%d-%m-%Y');
      const inicio = start instanceof Date ? fmt(start) : '-';
      const fin = task.type === 'milestone' || !(end instanceof Date) ? '-' : fmt(end);
      return `<b>${task.text}</b><br/>Inicio: ${inicio}<br/>Fin: ${fin}`;
    };
    gantt.templates.task_end_date = (date: any) => {
      return date instanceof Date ? gantt.date.date_to_str('%d-%m-%y')(date) : '';
    };
    gantt.init(this.ganttContainer.nativeElement);
    if (typeof (gantt as any).addMarker === 'function') {
      (gantt as any).addMarker({ start_date: new Date(), css: 'today-line', text: 'Hoy' });
    }
  }

  deleteTask(taskId: number) {
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
      this.ganttTasks = gantt.getTaskByTime();
      this.cdr.detectChanges();
    });
  }

  editTask(taskId: number) {
    const task = gantt.getTask(taskId);
    const isMilestone = task.type === 'milestone' || !task.end_date || task.end_date === task.start_date;
    this.editMilestoneScheduleItem = {
      id: Number(task.id),
      milestoneId: task['milestoneId'],
      text: task.text,
      plannedStartDate: task.start_date ? this.parseDateToString(task.start_date) : '',
      plannedEndDate: isMilestone ? null : (task.end_date ? this.parseDateToString(task.end_date) : null),
    };
    this.showEditModal = true;
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

  private drawTodayLine(): void {
    if (!this.ganttContainer) return;

    const existing = this.ganttContainer.nativeElement.querySelector('#today-line-custom');
    if (existing) existing.remove();

    const state = gantt.getState();
    const minDate: Date = state.min_date;
    const maxDate: Date = state.max_date;
    const today = new Date();

    if (!(minDate instanceof Date) || !(maxDate instanceof Date)) return;

    const totalMs = maxDate.getTime() - minDate.getTime();
    if (totalMs <= 0 || today < minDate || today > maxDate) return;

    const pct = (today.getTime() - minDate.getTime()) / totalMs;

    const taskArea = this.ganttContainer.nativeElement.querySelector('.gantt_data_area') as HTMLElement;
    if (!taskArea) return;

    const left = taskArea.scrollWidth * pct;

    taskArea.style.position = 'relative';
    taskArea.style.zIndex = '0';

    const line = document.createElement('div');
    line.id = 'today-line-custom';
    line.style.cssText = `position:absolute;left:${left}px;top:0;width:2px;height:9999px;background:#f59e0b;opacity:0.85;z-index:1;pointer-events:none;`;

    const label = document.createElement('span');
    label.textContent = 'Hoy';
    label.style.cssText = 'font-size:10px;color:#f59e0b;position:absolute;top:2px;left:4px;white-space:nowrap;';
    line.appendChild(label);

    taskArea.appendChild(line);
    this.updateTodayLineVisibility();
  }

  private updateTodayLineVisibility() {
    const line = document.getElementById('today-line-custom');
    if (!line) return;
    const anyModalOpen =
      this.showDetailModal ||
      this.showCreateModal ||
      this.showMilestoneScheduleHistory ||
      this.showCreateMilestoneScheduleModal ||
      this.showEditModal;
    line.style.display = anyModalOpen ? 'none' : 'block';
  }

  private destroyGantt() {
    gantt.clearAll();
    if (this.ganttContainer) {
      const line = this.ganttContainer.nativeElement.querySelector('#today-line-custom');
      if (line) line.remove();
    }
  }

  toggleCulminar(taskId: number): void {
    const task = gantt.getTask(taskId);
    if (task['fechaRealFin']) {
      task['fechaRealFin'] = null;
    } else {
      task['fechaRealFin'] = this.parseDateToString(new Date());
    }
    if (!task.end_date || !(task.end_date instanceof Date)) {
      task.end_date = task.start_date;
      task.type = 'milestone';
      task.duration = 0;
    }
    gantt.updateTask(taskId);
    gantt.render();
    this.ganttTasks = gantt.getTaskByTime();
    if (this.selectedTask && this.selectedTask.id == taskId) {
      this.selectedTask['fechaRealFin'] = task['fechaRealFin'];
    }
    this.cdr.detectChanges();

    const dtoItem = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.find(
      (x) => x.milestoneId == taskId,
    );
    if (dtoItem) {
      (dtoItem as any).fechaRealFin = task['fechaRealFin'] ?? null;
    }
  }

  saveEditTask() {
    const item = this.editMilestoneScheduleItem;

    if (!item.plannedStartDate) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'La fecha de inicio es obligatoria.' });
      return;
    }

    const startClean = item.plannedStartDate.substring(0, 10);
    const endClean = item.plannedEndDate ? item.plannedEndDate.substring(0, 10) : null;
    const startDate = this.parseStringToDate(startClean);
    const endDate = endClean ? this.parseStringToDate(endClean) : null;

    const undatedIdx = this.undatedTasks.findIndex((t) => t.milestoneId === item.milestoneId);
    const isUndated = undatedIdx !== -1;

    if (isUndated) {
      // Solo almacena las fechas en undatedTasks — la promoción al Gantt ocurre al presionar "Guardar"
      const task = this.undatedTasks[undatedIdx];
      task.start_date = startDate;
      task.end_date   = endDate;
      task.startDate  = startClean ?? '';
      task.endDate    = endClean   ?? '';
    } else {
      // Actualizar tarea existente en el Gantt
      const task = gantt.getTask(item.id);
      task.text = item.text;
      task.start_date = startDate ?? undefined;
      if (endClean) {
        task.end_date = endDate ?? undefined;
        task.type = undefined;
        task.duration = undefined;
      } else {
        task.end_date = task.start_date;
        task.type = 'milestone';
        task.duration = 0;
      }
      gantt.updateTask(task.id);
      gantt.render();
      this.ganttTasks = gantt.getTaskByTime();
    }

    this.showEditModal = false;
    this.cdr.detectChanges();

    const dtoItem = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.find(
      (x) => x.milestoneId === item.id,
    );
    if (dtoItem) {
      dtoItem.plannedStartDate = startClean || '';
      dtoItem.plannedEndDate = endClean;
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

    if (err.status === 401) {
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
