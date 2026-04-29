import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InduccionService } from '../../services/induccion.service';
import { InduccionDto } from '../../dtos/induccion.model';
import { ProgramarInduccion } from './components/programar-induccion/programar-induccion';

@Component({
  selector: 'app-hab-inducciones',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, ProgramarInduccion],
  templateUrl: './inducciones.html',
  styleUrl: './inducciones.css',
})
export class Inducciones implements OnInit, OnDestroy {
  readonly pageSize = 20;

  inducciones: InduccionDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroEstado = '';
  filtroFecha = '';
  filtroProyectoId: number | null = null;

  modalProgramarOpen = false;

  estadoOptions = [
    { id: '', label: 'Todos' },
    { id: 'PROGRAMADA', label: 'Programada' },
    { id: 'COMPLETADA', label: 'Completada' },
    { id: 'CANCELADA', label: 'Cancelada' },
  ];

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private induccionService: InduccionService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));
    this.load(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP')
    );
  }

  load(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      estado: this.filtroEstado || undefined,
      fecha: this.filtroFecha || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
    };
    this.induccionService.getInducciones(params).subscribe({
      next: (res) => {
        this.inducciones = res.data ?? [];
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

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  abrirProgramar(): void {
    this.modalProgramarOpen = true;
  }

  closeProgramar(): void {
    this.modalProgramarOpen = false;
  }

  onSaved(): void {
    this.modalProgramarOpen = false;
    this.load(this.currentPage);
  }

  marcarCompletada(item: InduccionDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Marcar como completada?',
      text: `${item.workerNombre} — ${item.proyectoNombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cambiarEstado(item.id, 'COMPLETADA', 'Marcada como completada');
    });
  }

  cancelar(item: InduccionDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Cancelar inducción?',
      text: `${item.workerNombre} — ${item.proyectoNombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cambiarEstado(item.id, 'CANCELADA', 'Inducción cancelada');
    });
  }

  private cambiarEstado(id: number, estado: string, title: string): void {
    this.loaderService.show();
    this.induccionService.patchEstado(id, estado).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title, timer: 1500, showConfirmButton: false });
        this.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  getEstadoChip(estado: string): string {
    switch (estado) {
      case 'PROGRAMADA':
        return 'chip-orange';
      case 'COMPLETADA':
        return 'chip-green';
      case 'CANCELADA':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }
}
