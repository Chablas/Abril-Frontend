import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { ClinicaSimpleDto } from '../../../dtos/catalogos.model';
import { ClinicaForm } from '../clinica-form/clinica-form';

@Component({
  selector: 'app-catalogo-clinicas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, ClinicaForm],
  templateUrl: './catalogo-clinicas.html',
  styleUrl: './catalogo-clinicas.css',
})
export class CatalogoClinicas implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo' };

  all: ClinicaSimpleDto[] = [];
  filtered: ClinicaSimpleDto[] = [];
  pageItems: ClinicaSimpleDto[] = [];

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  formInitial: ClinicaSimpleDto | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters(1));
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.listClinicas().subscribe({
      next: (res) => {
        this.all = res ?? [];
        this.applyFilters(1);
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

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;
    this.filtered = this.all.filter((c) => {
      if (estado === 'activo' && !c.activo) return false;
      if (estado === 'inactivo' && c.activo) return false;
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.ruc ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      );
    });
    this.totalRecords = this.filtered.length;
    this.totalPages = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.applyFilters(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '' };
    this.applyFilters(1);
  }

  onPageChange(page: number): void {
    this.applyFilters(page);
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formInitial = null;
    this.formOpen = true;
  }

  openEdit(item: ClinicaSimpleDto): void {
    this.formMode = 'edit';
    this.formInitial = item;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formInitial = null;
  }

  onSaved(): void {
    this.formOpen = false;
    this.formInitial = null;
    this.load();
  }

  toggleActivo(item: ClinicaSimpleDto): void {
    const next = !item.activo;
    Swal.fire({
      icon: 'question',
      title: next ? '¿Activar clínica?' : '¿Desactivar clínica?',
      text: item.nombre,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service
        .updateClinica(item.id, {
          nombre: item.nombre,
          ruc: item.ruc ?? null,
          email: item.email ?? null,
          telefono: item.telefono ?? null,
          direccion: item.direccion ?? null,
          activo: next,
        })
        .subscribe({
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

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }
}
