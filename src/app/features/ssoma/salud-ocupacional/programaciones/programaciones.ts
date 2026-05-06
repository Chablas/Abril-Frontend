import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ProgramacionService } from '../services/programacion.service';
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import {
  EstadoProgramacion,
  ProgramacionListDto,
  ProgramacionQueryParams,
} from '../dtos/programacion.model';
import { ClinicaSimpleDto } from '../dtos/catalogos.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../shared/components/view-toggle/view-toggle.model';
import {
  estadoBadgeClass,
  estadoProgramacionStyle,
} from '../shared/estado.utils';
import { ProgramacionCreate } from './components/programacion-create/programacion-create';

interface DiaCalendario {
  fecha: Date;
  key: string;
  items: ProgramacionListDto[];
}

interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-salud-programaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    ViewToggle,
    ProgramacionCreate,
    DatePipe,
  ],
  templateUrl: './programaciones.html',
  styleUrl: './programaciones.css',
})
export class Programaciones implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: '',
    desde: '',
    hasta: '',
  };

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Programada', nombre: 'Programada' },
    { id: 'Confirmada', nombre: 'Confirmada' },
    { id: 'Completada', nombre: 'Completada' },
    { id: 'Programado', nombre: 'Programado' },
    { id: 'Confirmado', nombre: 'Confirmado' },
    { id: 'Aceptado por Clínica', nombre: 'Aceptado por Clínica' },
    { id: 'Rechazado por Clínica', nombre: 'Rechazado por Clínica' },
    { id: 'En Atención', nombre: 'En Atención' },
    { id: 'Completado', nombre: 'Completado' },
    { id: 'No se presentó', nombre: 'No se presentó' },
    { id: 'Cancelado', nombre: 'Cancelado' },
    { id: 'Cancelada', nombre: 'Cancelada' },
    { id: 'Reprogramado', nombre: 'Reprogramado' },
  ];

  viewModes: ViewToggleMode[] = [
    {
      value: 'list',
      label: 'Lista',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    },
    {
      value: 'calendar',
      label: 'Calendario',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    },
  ];
  viewMode: 'list' | 'calendar' = 'list';

  items: ProgramacionListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  createOpen = false;
  rechazandoId: number | null = null;
  motivoRechazo = '';
  filtroClinicaId: number | null = null;
  clinicas: ClinicaSimpleDto[] = [];

  // Calendario
  semanaInicio: Date = this.startOfWeek(new Date());
  calendarioDias: DiaCalendario[] = [];
  calendarioItems: ProgramacionListDto[] = [];

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: ProgramacionService,
    private catalogosSvc: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.catalogosSvc.getClinicas().subscribe((data) => (this.clinicas = data));
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: ProgramacionQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      estado: this.filters.estado || undefined,
      desde: this.filters.desde || undefined,
      hasta: this.filters.hasta || undefined,
      clinicaId: this.filtroClinicaId ?? undefined,
    };
    this.service.getProgramaciones(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadSemana(): void {
    this.loading = true;
    this.loaderService.show();
    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);
    const query: ProgramacionQueryParams = {
      desde: this.toIsoDate(this.semanaInicio),
      hasta: this.toIsoDate(fin),
      pageSize: 500,
      page: 1,
    };
    this.service.getProgramaciones(query).subscribe({
      next: (res) => {
        this.calendarioItems = res.data ?? [];
        this.buildCalendarioDias();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private buildCalendarioDias(): void {
    const dias: DiaCalendario[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(this.semanaInicio);
      fecha.setDate(fecha.getDate() + i);
      const key = this.toIsoDate(fecha);
      dias.push({
        fecha,
        key,
        items: this.calendarioItems
          .filter((p) => (p.fecha || '').substring(0, 10) === key)
          .sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
      });
    }
    this.calendarioDias = dias;
  }

  onViewModeChange(mode: string): void {
    this.viewMode = mode as 'list' | 'calendar';
    if (mode === 'calendar') this.loadSemana();
  }

  prevSemana(): void {
    const d = new Date(this.semanaInicio);
    d.setDate(d.getDate() - 7);
    this.semanaInicio = d;
    this.loadSemana();
  }

  nextSemana(): void {
    const d = new Date(this.semanaInicio);
    d.setDate(d.getDate() + 7);
    this.semanaInicio = d;
    this.loadSemana();
  }

  hoySemana(): void {
    this.semanaInicio = this.startOfWeek(new Date());
    this.loadSemana();
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '', desde: '', hasta: '' };
    this.filtroClinicaId = null;
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  onCreated(): void {
    this.createOpen = false;
    if (this.viewMode === 'calendar') this.loadSemana();
    else this.load(this.currentPage);
  }

  cambiarEstado(item: ProgramacionListDto, estado: EstadoProgramacion): void {
    Swal.fire({
      icon: 'question',
      title: `¿Marcar como "${estado}"?`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service.patchEstado(item.id, { estado }).subscribe({
        next: (updated) => {
          this.loaderService.hide();
          Object.assign(item, updated);
          if (this.viewMode === 'calendar') this.loadSemana();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoProgramacionStyle(estado));
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime())
      ? fecha
      : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  puedeConfirmar(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada';
  }

  puedeMarcarNoPresento(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada' || e.estado === 'Confirmada';
  }

  puedeCancelar(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada' || e.estado === 'Confirmada';
  }

  puedeAceptarClinica(e: ProgramacionListDto): boolean {
    return e.estado === 'Programado' || e.estado === 'Confirmado';
  }

  puedeRechazarClinica(e: ProgramacionListDto): boolean {
    return e.estado === 'Programado' || e.estado === 'Confirmado';
  }

  puedeVerMotivoRechazo(e: ProgramacionListDto): boolean {
    return !!e.motivoRechazo;
  }

  esAutomatico(e: ProgramacionListDto): boolean {
    return e.origen === 'Automatico';
  }

  iniciarRechazo(id: number): void {
    this.rechazandoId = id;
    this.motivoRechazo = '';
  }

  confirmarRechazo(item: ProgramacionListDto): void {
    if (!this.motivoRechazo.trim()) return;
    this.rechazandoId = null;
    this.service
      .accionClinica(item.id, { id: item.id, accion: 'Rechazar', motivoRechazo: this.motivoRechazo })
      .subscribe({
        next: () => this.load(this.currentPage),
        error: (err) => this.errorService.handleError(err),
      });
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() || 7; // 1..7, lunes=1
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return d;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  get kpis() {
    return {
      programados: this.items.filter((i) => i.estado === 'Programado').length,
      aceptados: this.items.filter((i) => i.estado === 'Aceptado por Clínica').length,
      enAtencion: this.items.filter((i) => i.estado === 'En Atención').length,
      completados: this.items.filter((i) => i.estado === 'Completado').length,
      rechazados: this.items.filter((i) => i.estado === 'Rechazado por Clínica').length,
      noPresento: this.items.filter((i) => i.estado === 'No se presentó').length,
      automaticos: this.items.filter((i) => i.origen === 'Automatico').length,
    };
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.estado ||
      this.filters.desde ||
      this.filters.hasta ||
      this.filtroClinicaId
    );
  }

  get semanaLabel(): string {
    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${this.semanaInicio.toLocaleDateString('es-PE', opts)} — ${fin.toLocaleDateString('es-PE', opts)}`;
  }
}
