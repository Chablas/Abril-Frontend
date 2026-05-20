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
import { InduccionService } from '../../services/induccion.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { BandejaAprobarDto, BandejaItemDto } from '../../dtos/bandeja.model';
import { InduccionListDto } from '../../dtos/induccion.model';

interface InduccionGrupo {
  key: string;
  proyectoId: number;
  proyectoNombre: string;
  empresaId: number;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  items: InduccionListDto[];
  seleccionados: Set<number>;
}

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

  // ── Inducciones agrupadas ─────────────────────────────────
  induccionGrupos: InduccionGrupo[] = [];
  loadingInducciones = false;

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private bandejaService: BandejaService,
    private induccionService: InduccionService,
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

  // ── Lista estándar ────────────────────────────────────────

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
    if (tipo === 'INDUCCION') {
      this.loadInducciones();
    } else {
      this.loadItems(1);
    }
  }

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.loadItems(page);
  }

  // ── Inducciones agrupadas ─────────────────────────────────

  loadInducciones(): void {
    this.loadingInducciones = true;
    this.loaderService.show();
    this.induccionService.getList({ estado: 'PROGRAMADA' }).subscribe({
      next: (items) => {
        this.induccionGrupos = this.groupInducciones(items);
        this.loadingInducciones = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInducciones = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private groupInducciones(items: InduccionListDto[]): InduccionGrupo[] {
    const map = new Map<string, InduccionGrupo>();
    for (const item of items) {
      const key = `${item.proyectoId}-${item.empresaId}-${item.fechaProgramada.substring(0, 10)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          proyectoId: item.proyectoId,
          proyectoNombre: item.proyectoNombre,
          empresaId: item.empresaId,
          empresaNombre: item.empresaNombre,
          fechaProgramada: item.fechaProgramada,
          trabajoAltura: item.trabajoAltura,
          equipoElectrico: item.equipoElectrico,
          items: [],
          seleccionados: new Set<number>(),
        });
      }
      const grupo = map.get(key)!;
      grupo.items.push(item);
      if (item.ingresoConfirmado) grupo.seleccionados.add(item.id);
    }
    return Array.from(map.values());
  }

  nAsistieron(grupo: InduccionGrupo): number {
    return grupo.items.filter((i) => i.ingresoConfirmado).length;
  }

  allSelected(grupo: InduccionGrupo): boolean {
    const asistentes = grupo.items.filter((i) => i.ingresoConfirmado);
    return asistentes.length > 0 && asistentes.every((i) => grupo.seleccionados.has(i.id));
  }

  toggleWorker(grupo: InduccionGrupo, item: InduccionListDto): void {
    if (!item.ingresoConfirmado) return;
    if (grupo.seleccionados.has(item.id)) {
      grupo.seleccionados.delete(item.id);
    } else {
      grupo.seleccionados.add(item.id);
    }
    this.cdr.detectChanges();
  }

  toggleSelectAll(grupo: InduccionGrupo, checked: boolean): void {
    grupo.seleccionados.clear();
    if (checked) {
      grupo.items.filter((i) => i.ingresoConfirmado).forEach((i) => grupo.seleccionados.add(i.id));
    }
    this.cdr.detectChanges();
  }

  aprobarGrupo(grupo: InduccionGrupo): void {
    if (grupo.seleccionados.size === 0) return;
    const ids = Array.from(grupo.seleccionados);
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${ids.length} inducción(es)?`,
      html: `<div style="text-align:left;font-size:0.9rem">
              <strong>${grupo.proyectoNombre}</strong><br/>
              <span style="color:#6b7280">${grupo.empresaNombre} · ${grupo.fechaProgramada.substring(0, 10)}</span>
            </div>`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.induccionService.aprobarBatch(ids).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Aprobados', timer: 1500, showConfirmButton: false });
          this.loadInducciones();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
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
      case 'TRABAJADOR': return 'chip-blue';
      case 'EMPRESA':    return 'chip-green';
      case 'EQUIPO':     return 'chip-gray';
      case 'INDUCCION':  return 'chip-orange';
      default:           return 'chip-gray';
    }
  }

  // ── Acciones ──────────────────────────────────────────────

  aprobar(item: BandejaItemDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      html: `<div style="text-align:left;font-size:0.9rem">
              <strong>${item.nombreEntregable}</strong><br/>
              <span style="color:#6b7280">${item.entidadNombre}</span>
              ${item.vigencia ? `<div style="margin-top:0.75rem"><label style="font-size:0.75rem;color:#6b7280;text-transform:uppercase">Vigencia</label><input type="date" value="${item.vigencia.substring(0, 10)}" readonly style="display:block;width:100%;margin-top:4px;padding:0.45rem 0.65rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.875rem;background:#f9fafb;color:#374151;cursor:default"/></div>` : ''}
            </div>`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.executeAction(item, { estado: 'Aprobado' }, 'Aprobado');
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
