import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { MiSaludService } from './mi-salud.service';
import { MiSaludModalComponent } from './mi-salud-modal.component';
import { MiSaludResumenDto, MiDescansoDto } from './mi-salud.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { SSOMA_TABS } from '../topico/topico.component';

@Component({
  selector: 'app-mi-salud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent, Paginator, MiSaludModalComponent],
  templateUrl: './mi-salud.component.html',
  styleUrl: './mi-salud.component.css',
})
export class MiSaludComponent implements OnInit, OnDestroy {
  readonly tabs       = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize   = 10;

  resumen      : MiSaludResumenDto | null = null;
  descansos    : MiDescansoDto[] = [];
  loadingResumen  = false;
  loadingDescansos = false;
  totalPages   = 1;
  totalRecords = 0;
  currentPage  = 1;

  modalVisible = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc         : MiSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr         : ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadResumen();
    this.loadDescansos(1);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadResumen(): void {
    this.loadingResumen = true;
    this.loaderService.show();
    this.svc.getResumen().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.resumen        = r;
        this.loadingResumen = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  loadDescansos(page: number): void {
    this.loadingDescansos = true;
    this.svc.getDescansos(page).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: PagedResponseDTO<MiDescansoDto>) => {
        this.descansos       = res.data;
        this.currentPage     = res.page;
        this.totalPages      = Math.max(res.totalPages, 1);
        this.totalRecords    = res.totalRecords;
        this.loadingDescansos = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDescansos = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onPageChange(p: number): void { this.loadDescansos(p); }

  abrirModal(): void  { this.modalVisible = true;  this.cdr.detectChanges(); }
  cerrarModal(): void { this.modalVisible = false; this.cdr.detectChanges(); }

  onGuardado(): void {
    this.cerrarModal();
    this.loadResumen();
    this.loadDescansos(1);
  }

  estadoClass(estado: string | null): string {
    const m: Record<string, string> = {
      'Pendiente':   'badge-amber',
      'En Revisión': 'badge-blue',
      'Aprobado':    'badge-green',
      'Rechazado':   'badge-red',
      'Vencido':     'badge-gray',
    };
    return m[estado ?? ''] ?? 'badge-gray';
  }

  aptitudClass(aptitud: string | null): string {
    if (aptitud === 'Apto') return 'chip-green';
    if (aptitud === 'Apto con Restricciones') return 'chip-amber';
    if (aptitud === 'No Apto') return 'chip-red';
    if (aptitud === 'Observado') return 'chip-orange';
    return 'chip-gray';
  }

  diasClass(dias: number | null): string {
    if (dias == null) return 'chip-gray';
    if (dias <= 0)   return 'chip-red';
    if (dias <= 30)  return 'chip-amber';
    return 'chip-green';
  }
}
