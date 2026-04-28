import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SctrVidaLeyService } from '../../services/sctr-vidaley.service';
import { SctrVidaLeyDto } from '../../dtos/sctr.model';
import { environment } from '../../../../../environments/environment';
import { SctrSubir } from './components/sctr-subir/sctr-subir';
import { SctrAprobar } from './components/sctr-aprobar/sctr-aprobar';

@Component({
  selector: 'app-hab-sctr-vidaley',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, SctrSubir, SctrAprobar],
  templateUrl: './sctr-vidaley.html',
  styleUrl: './sctr-vidaley.css',
})
export class SctrVidaley implements OnInit, OnDestroy {
  readonly pageSize = 20;

  documentos: SctrVidaLeyDto[] = [];
  selectedDoc: SctrVidaLeyDto | null = null;
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroTipo = '';
  filtroEstado = '';
  filtroMes: number | null = null;
  filtroAnio: number = new Date().getFullYear();
  filtroEmpresaId: number | null = null;

  modalSubirOpen = false;
  modalAprobarOpen = false;

  meses = [
    { num: 1, label: 'Enero' },
    { num: 2, label: 'Febrero' },
    { num: 3, label: 'Marzo' },
    { num: 4, label: 'Abril' },
    { num: 5, label: 'Mayo' },
    { num: 6, label: 'Junio' },
    { num: 7, label: 'Julio' },
    { num: 8, label: 'Agosto' },
    { num: 9, label: 'Septiembre' },
    { num: 10, label: 'Octubre' },
    { num: 11, label: 'Noviembre' },
    { num: 12, label: 'Diciembre' },
  ];

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private sctrService: SctrVidaLeyService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadDocumentos(1));
    this.loadDocumentos(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocumentos(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tipo: this.filtroTipo || undefined,
      estado: this.filtroEstado || undefined,
      mes: this.filtroMes ?? undefined,
      anio: this.filtroAnio || undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
    };
    this.sctrService.getList(params).subscribe({
      next: (res) => {
        this.documentos = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        if (this.selectedDoc) {
          const refreshed = this.documentos.find((d) => d.id === this.selectedDoc?.id);
          this.selectedDoc = refreshed ?? null;
        }
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
    this.loadDocumentos(page);
  }

  selectDoc(doc: SctrVidaLeyDto): void {
    this.selectedDoc = doc;
  }

  isContratista(): boolean {
    return this.authService.hasRole('CONTRATISTA');
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR SSOMA') ||
      this.authService.hasRole('ADMINISTRADOR DE UDP')
    );
  }

  abrirSubir(): void {
    this.modalSubirOpen = true;
  }

  closeSubir(): void {
    this.modalSubirOpen = false;
  }

  onSubirSaved(): void {
    this.modalSubirOpen = false;
    this.loadDocumentos(this.currentPage);
  }

  abrirAprobar(): void {
    if (!this.selectedDoc) return;
    this.modalAprobarOpen = true;
  }

  closeAprobar(): void {
    this.modalAprobarOpen = false;
  }

  onAprobarSaved(): void {
    this.modalAprobarOpen = false;
    this.loadDocumentos(this.currentPage);
  }

  getMesLabel(num: number): string {
    return this.meses.find((m) => m.num === num)?.label ?? String(num);
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Parcial':
        return 'chip-orange';
      case 'Rechazado':
        return 'chip-red';
      case 'Enviado':
        return 'chip-orange';
      case 'Falta':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  getViewUrl(url: string): string {
    return `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
  }

  verArchivo(url: string | undefined): void {
    if (!url) return;
    if (typeof window !== 'undefined') {
      window.open(this.getViewUrl(url), '_blank', 'noopener');
    }
  }
}
