import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { BandejaService } from '../../services/bandeja.service';
import { BandejaAprobarDto, BandejaItemDto } from '../../dtos/bandeja.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hab-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator],
  templateUrl: './bandeja.html',
  styleUrl: './bandeja.css',
})
export class Bandeja implements OnInit, OnDestroy {
  readonly pageSize = 20;

  items: BandejaItemDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroTipo = '';
  filtroResponsable = '';
  filtroProyectoId: number | null = null;
  filtroEmpresaId: number | null = null;

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private bandejaService: BandejaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filterChange$
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.loadItems(1));
    this.loadItems(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadItems(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tipo: this.filtroTipo || undefined,
      responsable: this.filtroResponsable || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
    };
    this.bandejaService.getPendientes(params).subscribe({
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

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.loadItems(page);
  }

  getTotal(tipo: string): number {
    return this.items.filter((i) => i.tipo === tipo).length;
  }

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'TRABAJADOR':
        return 'chip-blue';
      case 'EMPRESA':
        return 'chip-green';
      case 'EQUIPO':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  getViewUrl(url: string): string {
    return `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
  }

  verArchivo(item: BandejaItemDto): void {
    if (!item.archivoUrl) return;
    if (typeof window !== 'undefined') {
      window.open(this.getViewUrl(item.archivoUrl), '_blank', 'noopener');
    }
  }

  aprobar(item: BandejaItemDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      html: `<div style="text-align:left;font-size:0.9rem">
              <strong>${item.nombreEntregable}</strong><br/>
              <span style="color:#6b7280">${item.entidadNombre}</span>
            </div>`,
      input: 'date',
      inputLabel: 'Vigencia (opcional)',
      inputValue: item.vigencia ? item.vigencia.substring(0, 10) : '',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      const payload: BandejaAprobarDto = {
        estado: 'Aprobado',
        vigencia: res.value || undefined,
      };
      this.executeAction(item, payload, 'Aprobado');
    });
  }

  rechazar(item: BandejaItemDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Describe el motivo…',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed) return;
      const payload: BandejaAprobarDto = {
        estado: 'Rechazado',
        obsAbril: res.value,
      };
      this.executeAction(item, payload, 'Rechazado');
    });
  }

  private executeAction(
    item: BandejaItemDto,
    payload: BandejaAprobarDto,
    titleSuccess: string,
  ): void {
    const obs$ =
      item.tipo === 'TRABAJADOR'
        ? this.bandejaService.aprobarTrabajador(item.id, payload)
        : item.tipo === 'EMPRESA'
          ? this.bandejaService.aprobarEmpresa(item.id, payload)
          : this.bandejaService.aprobarEquipo(item.id, payload);

    this.loaderService.show();
    obs$.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: titleSuccess,
          timer: 1500,
          showConfirmButton: false,
        });
        this.loadItems(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
