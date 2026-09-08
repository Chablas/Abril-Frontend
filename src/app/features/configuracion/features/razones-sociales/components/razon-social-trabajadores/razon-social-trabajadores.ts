import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { RazonSocialService } from '../../services/razon-social.service';
import { RazonSocial, RazonSocialTrabajador } from '../../dtos/razon-social.dto';

/** Ids fijos del catálogo workers_obra_oficina_staff (ver ObraOficinaStaffIds en el backend). */
const OBRA_OFICINA_STAFF_IDS = { obra: 1, staff: 2, oficinaCentral: 3, personalExterno: 4 } as const;

/**
 * Detalle de una razón social: los trabajadores que hoy están en Abril bajo ella. Se abre al
 * hacer clic en la fila de la tabla y pide su propia lista al abrirse (la carga inicial de la
 * pantalla solo trae el conteo: una razón social puede tener cientos de fichas).
 */
@Component({
  standalone: true,
  selector: 'app-razon-social-trabajadores',
  imports: [CommonModule, BaseModal, Paginator, SearchInput, TitleCasePipe],
  templateUrl: './razon-social-trabajadores.html',
})
export class RazonSocialTrabajadoresModal implements OnInit {
  /** Razón social cuya fila se clickeó: de acá salen el nombre y el RUC del encabezado. */
  @Input({ required: true }) razonSocial!: RazonSocial;
  @Output() closed = new EventEmitter<void>();

  trabajadores: RazonSocialTrabajador[] = [];
  /** La respuesta ya llegó (aunque venga vacía): distingue «sin trabajadores» de «cargando». */
  cargado = false;
  searchText = '';

  private readonly pager = new ClientPager<RazonSocialTrabajador>();

  constructor(
    private service: RazonSocialService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getTrabajadores(this.razonSocial.id).subscribe({
      next: (data) => {
        // El backend ya los manda ordenados por nombre.
        this.trabajadores = data ?? [];
        this.cargado = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closed.emit();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────

  /**
   * Va inline y no en `app-filter-modal`: es un solo campo dentro de un modal, y abrir un modal
   * de filtros encima de este sería peor de usar. El tipo de ubicación entra en la búsqueda para
   * que «staff» u «obra» sirvan de filtro sin gastar un desplegable aparte.
   */
  onSearchChange(): void {
    this.pager.reset();
  }

  get filteredTrabajadores(): RazonSocialTrabajador[] {
    if (!this.searchText.trim()) return this.trabajadores;
    return this.trabajadores.filter(
      (t) =>
        SearchInput.matches(t.nombreCompleto ?? '', this.searchText) ||
        SearchInput.matches(t.emailCorporativo ?? '', this.searchText) ||
        SearchInput.matches(t.tipoUbicacionNombre ?? '', this.searchText),
    );
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredTrabajadores);
  }

  get pagedTrabajadores(): RazonSocialTrabajador[] {
    return this.pager.page(this.filteredTrabajadores);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Tipo de ubicación ─────────────────────────────────────────────────

  /**
   * Tono del chip de tipo de ubicación. Obra va en ámbar porque es la que separa al personal
   * de campo del de escritorio; los tres de escritorio en tonos propios, y el gris queda para
   * las fichas del padrón viejo que nunca tuvieron el dato cargado.
   */
  tipoUbicacionClase(id: number | null): string {
    switch (id) {
      case OBRA_OFICINA_STAFF_IDS.obra:            return 'bg-[#FFF3DC] text-[#B26A00]';
      case OBRA_OFICINA_STAFF_IDS.staff:           return 'bg-[#EAF6FF] text-[#0B6BA8]';
      case OBRA_OFICINA_STAFF_IDS.oficinaCentral:  return 'bg-[#D7FAF4] text-[#009C87]';
      case OBRA_OFICINA_STAFF_IDS.personalExterno: return 'bg-[#EFE7FB] text-[#6B3FA0]';
      default:                                     return 'bg-gray-100 text-gray-500';
    }
  }
}
