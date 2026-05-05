import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { BandejaService } from '../../services/bandeja.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { BandejaAprobarDto, BandejaItemDto } from '../../dtos/bandeja.model';

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

  // ── Panel derecho ─────────────────────────────────────────
  selectedItem: BandejaItemDto | null = null;
  docSafeUrl: SafeResourceUrl | null = null;
  loadingDoc = false;
  private docBlobUrl = '';

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private bandejaService: BandejaService,
    private sharepointService: SharepointUploadService,
    private sanitizer: DomSanitizer,
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
    this.revokeDocBlobUrl();
  }

  // ── Lista ─────────────────────────────────────────────────

  loadItems(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tipo: this.filtroTipo || undefined,
      responsable: this.filtroResponsable || undefined,
    };
    this.bandejaService.getPendientes(params).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        if (this.selectedItem) {
          const refreshed = this.items.find((i) => i.id === this.selectedItem?.id);
          if (!refreshed) this.clearDocPanel();
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

  setTipo(tipo: string): void {
    this.filtroTipo = tipo;
    this.loadItems(1);
  }

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.loadItems(page);
  }

  // ── Selección y visor PDF ─────────────────────────────────

  selectItem(item: BandejaItemDto): void {
    if (this.selectedItem?.id === item.id) return;
    this.clearDocPanel();
    this.selectedItem = item;
    this.loadingDoc = !!item.archivoUrl;
    if (item.archivoUrl) {
      this.loadDocBlob(item.archivoUrl);
    }
  }

  private clearDocPanel(): void {
    this.docSafeUrl = null;
    this.loadingDoc = false;
    this.revokeDocBlobUrl();
  }

  private loadDocBlob(archivoUrl: string): void {
    this.docSafeUrl = null;
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        fetch(res.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            this.revokeDocBlobUrl();
            this.docBlobUrl = URL.createObjectURL(blob);
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.docBlobUrl);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          });
      },
      error: () => {
        this.loadingDoc = false;
        this.cdr.detectChanges();
      },
    });
  }

  private revokeDocBlobUrl(): void {
    if (this.docBlobUrl) {
      URL.revokeObjectURL(this.docBlobUrl);
      this.docBlobUrl = '';
    }
  }

  // ── Helpers visuales ──────────────────────────────────────

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'TRABAJADOR':
        return 'chip-blue';
      case 'EMPRESA':
        return 'chip-green';
      case 'EQUIPO':
        return 'chip-gray';
      case 'INDUCCION':
        return 'chip-orange';
      default:
        return 'chip-gray';
    }
  }

  // ── Acciones ──────────────────────────────────────────────

  aprobar(item: BandejaItemDto): void {
    if (item.tipo === 'INDUCCION') {
      Swal.fire({
        icon: 'question',
        title: '¿Aprobar inducción?',
        html: `<div style="text-align:left;font-size:0.9rem">
                <strong>${item.nombreEntregable}</strong><br/>
                <span style="color:#6b7280">${item.entidadNombre}</span>
              </div>`,
        showCancelButton: true,
        confirmButtonText: 'Aprobar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#64bc04',
        cancelButtonColor: '#6b7280',
      }).then((res) => {
        if (!res.isConfirmed) return;
        this.loaderService.show();
        this.bandejaService.aprobarInduccion(item.id).subscribe({
          next: () => {
            this.loaderService.hide();
            this.selectedItem = null;
            this.clearDocPanel();
            Swal.fire({ icon: 'success', title: 'Aprobado', timer: 1500, showConfirmButton: false });
            this.loadItems(this.currentPage);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      });
      return;
    }

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
      this.executeAction(item, { estado: 'Aprobado', vigencia: res.value || undefined }, 'Aprobado');
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
      this.executeAction(item, { estado: 'Rechazado', obsAbril: res.value }, 'Rechazado');
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
        this.selectedItem = null;
        this.clearDocPanel();
        Swal.fire({ icon: 'success', title: titleSuccess, timer: 1500, showConfirmButton: false });
        this.loadItems(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
