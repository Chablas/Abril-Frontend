import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
import { BancoService } from '../services/banco.service';
import { Banco } from '../dtos/banco.dto';
import { BancoForm } from './banco-form/banco-form';

/**
 * Configuración → Bancos: el catálogo del que sale el desplegable «Banco» de las razones sociales
 * del grupo, y de ahí el banco que el formulario de bienvenida le nombra al nuevo colaborador
 * cuando le pregunta si quiere su cuenta sueldo.
 *
 * Son pocas filas: se traen todas de una vez y la pantalla filtra en memoria, sin paginar.
 */
@Component({
  selector: 'app-config-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchInput, SearchSelect, AbrilPageHeaderComponent, BancoForm],
  templateUrl: './bancos.html',
  styleUrl: './bancos.css',
})
export class Bancos implements OnInit, OnDestroy {
  readonly tabs = CONFIGURACION_TABS;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo' };

  readonly estadoOptions = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  all: Banco[] = [];
  filtered: Banco[] = [];
  loading = false;

  modalOpen = false;
  /** null = alta. Con banco = edición. */
  editItem: Banco | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: BancoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
        this.cdr.detectChanges();
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    // App zoneless: forzamos el refresco tras el subscribe o la tabla no se pinta.
    this.service.list().subscribe({
      next: (res) => {
        this.all = res ?? [];
        this.applyFilters();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;

    this.filtered = this.all.filter((b) => {
      if (estado === 'activo' && !b.activo) return false;
      if (estado === 'inactivo' && b.activo) return false;
      if (!q) return true;
      return SearchInput.matches(b.nombre, q) || b.codigo.toLowerCase().includes(q);
    });
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onEstadoChange(value: string | null): void {
    this.filters.estado = (value ?? '') as '' | 'activo' | 'inactivo';
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '' };
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }

  // ── Modal ───────────────────────────────────────────────────────────────

  openCreate(): void {
    this.editItem = null;
    this.modalOpen = true;
  }

  openEdit(banco: Banco): void {
    this.editItem = banco;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editItem = null;
  }

  /** Mete el alta o reemplaza la edición en la tabla, sin recargar el catálogo entero. */
  onSaved(banco: Banco): void {
    const i = this.all.findIndex((b) => b.id === banco.id);
    if (i >= 0) this.all[i] = banco;
    else this.all = [...this.all, banco];
    // El orden lo decide el catálogo, no el momento del alta.
    this.all.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
    this.applyFilters();
    this.closeModal();
    this.cdr.detectChanges();
  }

  /**
   * Elimina un banco. El backend rechaza los que alguna razón social todavía usa; acá se ataja
   * antes para explicar la alternativa (desactivarlo) en vez de mostrar un error.
   */
  eliminar(banco: Banco): void {
    if (banco.razonesSociales > 0) {
      Swal.fire({
        icon: 'info',
        title: 'No se puede eliminar',
        text: `${banco.razonesSociales} razón(es) social(es) trabajan con ${banco.nombre}. `
            + 'Cámbiales el banco o desactívalo en vez de eliminarlo.',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Eliminar el banco?',
      html: `Se eliminará <b>${banco.nombre}</b> del catálogo.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b91c1c',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.loaderService.show();
      this.service.delete(banco.id).subscribe({
        next: (r) => {
          this.loaderService.hide();
          this.all = this.all.filter((b) => b.id !== banco.id);
          this.applyFilters();
          Swal.fire({ icon: 'success', title: 'Banco eliminado', text: r.message, timer: 1500, showConfirmButton: false });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }
}
