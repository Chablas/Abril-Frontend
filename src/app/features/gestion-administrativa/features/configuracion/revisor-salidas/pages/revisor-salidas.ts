import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { RevisorSalidasService } from '../services/revisor-salidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  WorkerRevisorSalidaItemDTO,
  WorkerRevisorSalidaOptionDTO,
} from '../dtos/workerRevisorSalida.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  standalone: true,
  selector: 'app-revisor-salidas',
  imports: [CommonModule, FormsModule, SearchSelect, SearchInput, Paginator, AbrilPageHeaderComponent],
  templateUrl: './revisor-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class RevisorSalidas implements OnInit {
  anioActual = new Date().getFullYear();

  rows: WorkerRevisorSalidaItemDTO[] = [];
  options: WorkerRevisorSalidaOptionDTO[] = [];

  searchText = '';
  /** Filtro por revisor asignado: workerId del jefe o null = todos. */
  jefeFilter: number | null = null;
  /** Filtro por categoría del trabajador: workersCategoryId o null = todas. */
  categoriaTrabajadorFilter: number | null = null;

  currentPage = 1;
  readonly pageSize = 10;

  /** Worker en edición (solo uno a la vez) y jefe seleccionado en el selector. */
  editingWorkerId: number | null = null;
  selectedJefeId: number | null = null;

  constructor(
    private service: RevisorSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getRevisores().subscribe({
      next: (data) => {
        this.rows = data;
        this.service.getOptions().subscribe({
          next: (opts) => {
            this.options = opts;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  startEdit(item: WorkerRevisorSalidaItemDTO): void {
    this.editingWorkerId = item.workerId;
    this.selectedJefeId = item.jefeWorkerId ?? null;
  }

  cancelEdit(): void {
    this.editingWorkerId = null;
    this.selectedJefeId = null;
  }

  save(item: WorkerRevisorSalidaItemDTO): void {
    if (this.selectedJefeId === item.workerId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección inválida',
        text: 'Un trabajador no puede ser su propio revisor.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service.updateRevisor(item.workerId, { jefeWorkerId: this.selectedJefeId }).subscribe({
      next: () => {
        const jefe = this.options.find((o) => o.workerId === this.selectedJefeId);
        item.jefeWorkerId = this.selectedJefeId;
        item.jefeFullName = jefe?.fullName;
        item.jefeEmail = jefe?.email;
        this.cancelEdit();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRows(): WorkerRevisorSalidaItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.fullName ?? '', this.searchText) ||
        SearchInput.matches(r.jefeFullName ?? '', this.searchText);
      const matchesJefe = this.jefeFilter == null || r.jefeWorkerId === this.jefeFilter;
      const matchesCategoriaTrabajador =
        this.categoriaTrabajadorFilter == null || r.categoryId === this.categoriaTrabajadorFilter;
      return matchesName && matchesJefe && matchesCategoriaTrabajador;
    });
  }

  /** Categorías de los trabajadores listados (opciones del filtro). */
  get categoriaTrabajadorFilterOptions(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const r of this.rows) {
      if (r.categoryId != null && r.category && !seen.has(r.categoryId)) {
        seen.set(r.categoryId, r.category);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Revisores que aparecen asignados en la lista (opciones del filtro). */
  get jefeFilterOptions(): WorkerRevisorSalidaOptionDTO[] {
    const seen = new Map<number, WorkerRevisorSalidaOptionDTO>();
    for (const r of this.rows) {
      if (r.jefeWorkerId != null && !seen.has(r.jefeWorkerId)) {
        seen.set(r.jefeWorkerId, {
          workerId: r.jefeWorkerId,
          fullName: r.jefeFullName,
          email: r.jefeEmail,
        });
      }
    }
    return [...seen.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.cancelEdit();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): WorkerRevisorSalidaItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.cancelEdit();
  }
}
