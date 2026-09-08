import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';

@Component({
  selector: 'app-ev-periodos',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, StatusBadge, AbrilBulkActionDirective, Paginator, BaseModal],
  templateUrl: './periodos.html',
  styleUrl: './periodos.css',
})
export class EvPeriodos implements OnInit {
  periodos: EvPeriodoDto[] = [];
  loading = false;

  searchText = '';
  private readonly pager = new ClientPager<EvPeriodoDto>();

  showCrearModal = false;
  crearMes = 1;
  crearAnio = new Date().getFullYear();
  crearFechaApertura = '';
  crearFechaCierre = '';
  crearSubmitted = false;
  crearGuardando = false;

  showExtenderModal = false;
  periodoAExtender: EvPeriodoDto | null = null;
  nuevaFechaCierre = '';
  extenderSubmitted = false;
  extenderGuardando = false;

  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(
    private periodoService: EvPeriodoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.periodoService.getAll().subscribe({
      next: (data) => {
        this.periodos = data;
        this.pager.reset();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredPeriodos(): EvPeriodoDto[] {
    const texto = this.searchText.trim().toLowerCase();
    if (!texto) return this.periodos;
    return this.periodos.filter(
      (p) => p.nombreMes.toLowerCase().includes(texto) || `${p.anio}`.includes(texto),
    );
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredPeriodos);
  }

  get pagedPeriodos(): EvPeriodoDto[] {
    return this.pager.page(this.filteredPeriodos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // --- Activar / Desactivar ---------------------------------------------

  activar(p: EvPeriodoDto): void {
    Swal.fire({
      title: `¿Activar el período de ${p.nombreMes} ${p.anio}?`,
      text: 'Se abrirá inmediatamente la ventana de evaluación para este período.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.periodoService.activar(p.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  desactivar(p: EvPeriodoDto): void {
    Swal.fire({
      title: `¿Cortar el período de ${p.nombreMes} ${p.anio}?`,
      text: 'Se cerrará de inmediato la ventana de evaluación para este período.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cortar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.periodoService.desactivar(p.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // --- Extender -----------------------------------------------------------

  abrirExtender(p: EvPeriodoDto): void {
    this.periodoAExtender = p;
    this.nuevaFechaCierre = '';
    this.extenderSubmitted = false;
    this.showExtenderModal = true;
  }

  cerrarExtender(): void {
    this.showExtenderModal = false;
    this.periodoAExtender = null;
  }

  confirmarExtender(): void {
    this.extenderSubmitted = true;
    if (!this.periodoAExtender || !this.nuevaFechaCierre) return;

    this.extenderGuardando = true;
    this.periodoService.extender(this.periodoAExtender.id, this.nuevaFechaCierre).subscribe({
      next: () => {
        this.extenderGuardando = false;
        this.cerrarExtender();
        Swal.fire({ title: 'Período reabierto', icon: 'success', draggable: true });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.extenderGuardando = false;
        this.errorService.handleError(err);
      },
    });
  }

  // --- Crear ---------------------------------------------------------------

  abrirCrear(): void {
    this.crearMes = 1;
    this.crearAnio = new Date().getFullYear();
    this.crearFechaApertura = '';
    this.crearFechaCierre = '';
    this.crearSubmitted = false;
    this.showCrearModal = true;
  }

  cerrarCrear(): void {
    this.showCrearModal = false;
  }

  confirmarCrear(): void {
    this.crearSubmitted = true;
    if (!this.crearFechaApertura || !this.crearFechaCierre) return;

    this.crearGuardando = true;
    this.periodoService
      .crear({
        mes: this.crearMes,
        anio: this.crearAnio,
        fechaApertura: this.crearFechaApertura,
        fechaCierre: this.crearFechaCierre,
      })
      .subscribe({
        next: () => {
          this.crearGuardando = false;
          this.cerrarCrear();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.crearGuardando = false;
          this.errorService.handleError(err);
        },
      });
  }
}
