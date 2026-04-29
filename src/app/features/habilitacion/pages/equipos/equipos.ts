import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EquipoHabService } from '../../services/equipo-hab.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import {
  EquipoEntregableDto,
  EquipoEntregableUpdateDto,
  EquipoListDto,
} from '../../dtos/equipo.model';
import { environment } from '../../../../../environments/environment';
import { EquipoForm } from './components/equipo-form/equipo-form';

@Component({
  selector: 'app-hab-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, EquipoForm],
  templateUrl: './equipos.html',
  styleUrl: './equipos.css',
})
export class Equipos implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly pageSize = 20;

  equipos: EquipoListDto[] = [];
  selectedEquipo: EquipoListDto | null = null;
  entregables: EquipoEntregableDto[] = [];
  selectedEntregable: EquipoEntregableDto | null = null;

  loading = false;
  loadingEntregables = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroSearch = '';
  filtroProyectoId: number | null = null;

  modalNuevoOpen = false;
  modalEditarEquipo: EquipoListDto | null = null;

  panelArchivoUrl = '';
  panelArchivoNombre = '';
  panelVigencia = '';
  panelObsAbril = '';
  uploadingFile = false;

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private equipoService: EquipoHabService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadEquipos(1));
    this.loadEquipos(1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  loadEquipos(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      search: this.filtroSearch.trim() || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
    };
    this.equipoService.getEquipos(params).subscribe({
      next: (res) => {
        this.equipos = res.data ?? [];
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

  onSearch(): void {
    this.searchChange$.next();
  }

  onPageChange(page: number): void {
    this.loadEquipos(page);
  }

  selectEquipo(eq: EquipoListDto): void {
    this.selectedEquipo = eq;
    this.selectedEntregable = null;
    this.resetPanel();
    this.loadEntregablesEquipo(eq.id);
  }

  loadEntregablesEquipo(equipoId: number): void {
    this.loadingEntregables = true;
    this.entregables = [];
    this.equipoService.getEntregables(equipoId).subscribe({
      next: (res) => {
        this.entregables = res ?? [];
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEntregables = false;
        this.errorService.handleError(err);
      },
    });
  }

  selectEntregable(e: EquipoEntregableDto): void {
    this.selectedEntregable = e;
    this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
    this.panelArchivoUrl = e.archivoUrl ?? '';
    this.panelArchivoNombre = e.archivoUrl ? this.extractFileName(e.archivoUrl) : '';
    this.panelObsAbril = e.obsAbril ?? '';
  }

  private extractFileName(url: string): string {
    const parts = url.split(/[\\/]/);
    return parts[parts.length - 1] || url;
  }

  private resetPanel(): void {
    this.panelArchivoUrl = '';
    this.panelArchivoNombre = '';
    this.panelVigencia = '';
    this.panelObsAbril = '';
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.panelArchivoNombre = file.name;
    this.uploadingFile = true;
    this.cdr.detectChanges();

    const contexto = `habilitacion/equipos/${this.selectedEquipo?.id ?? 'sin-equipo'}`;
    this.sharepointService.subirArchivo(file, contexto).subscribe({
      next: (res) => {
        this.panelArchivoUrl = res.url;
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.panelArchivoUrl = `pending-upload://${file.name}`;
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  clearArchivo(): void {
    this.panelArchivoUrl = '';
    this.panelArchivoNombre = '';
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.selectedEquipo) return;

    let nuevoEstado = this.selectedEntregable.estado;
    if (this.isContratista()) {
      nuevoEstado = 'Enviado';
    } else if (this.isAdmin() && this.selectedEntregable.estado === 'Falta') {
      nuevoEstado = 'Enviado';
    }

    const payload: EquipoEntregableUpdateDto = {
      estado: nuevoEstado,
      vigencia: this.panelVigencia || undefined,
      archivoUrl: this.panelArchivoUrl || undefined,
    };

    this.loaderService.show();
    this.equipoService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Enviado',
          timer: 1500,
          showConfirmButton: false,
        });
        if (this.selectedEquipo) this.loadEntregablesEquipo(this.selectedEquipo.id);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  aprobarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedEquipo) return;
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedEquipo) return;
      this.loaderService.show();
      this.equipoService
        .updateEntregable(this.selectedEntregable.id, {
          estado: 'Aprobado',
          obsAbril: this.panelObsAbril || undefined,
          vigencia: this.panelVigencia || undefined,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Aprobado',
              timer: 1500,
              showConfirmButton: false,
            });
            if (this.selectedEquipo) this.loadEntregablesEquipo(this.selectedEquipo.id);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  rechazarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedEquipo) return;
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedEquipo) return;
      this.loaderService.show();
      this.equipoService
        .updateEntregable(this.selectedEntregable.id, {
          estado: 'Rechazado',
          obsAbril: res.value,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Rechazado',
              timer: 1500,
              showConfirmButton: false,
            });
            if (this.selectedEquipo) this.loadEntregablesEquipo(this.selectedEquipo.id);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  abrirNuevoEquipo(): void {
    this.modalEditarEquipo = null;
    this.modalNuevoOpen = true;
  }

  abrirEditarEquipo(eq: EquipoListDto, event?: Event): void {
    event?.stopPropagation();
    this.modalEditarEquipo = eq;
    this.modalNuevoOpen = true;
  }

  closeNuevoEquipo(): void {
    this.modalNuevoOpen = false;
    this.modalEditarEquipo = null;
  }

  onEquipoSaved(): void {
    this.modalNuevoOpen = false;
    this.modalEditarEquipo = null;
    this.loadEquipos(this.currentPage);
  }

  getEstadoHabClass(estado: string): string {
    return estado === 'Habilitado' ? 'chip-green' : 'chip-orange';
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'falta' || norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'no aplica') return 'dot-no-aplica';
    return 'dot-no-aplica';
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Enviado':
      case 'Rechazado':
        return 'chip-orange';
      case 'No Aplica':
        return 'chip-gray';
      default:
        return 'chip-gray';
    }
  }

  getViewUrl(url: string): string {
    return `${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`;
  }

  verArchivo(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(this.getViewUrl(url), '_blank', 'noopener');
    }
  }
}
