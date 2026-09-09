import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ReembolsosService, ReembolsoQuery } from '../../services/reembolsos.service';
import {
  ReembolsoSeguimientoDto,
  SeguimientoColaboradorDto,
} from '../../dtos/reembolso.dto';
import { reembolsoColors } from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * "Seguimiento de pagos": la segunda vista de Tesorería (11.4 del requerimiento). No es una
 * bandeja de trabajo —acá no se decide nada— sino la consulta de lo ya abonado, agrupada por
 * colaborador: cuánto se le pagó en total, en cuántas rendiciones y con qué guía cada una.
 *
 * Se agrupa por persona y no por planilla a propósito: una planilla puede cubrir a varios y lo
 * que Tesorería consulta acá es a quién le pagó cuánto.
 */
@Component({
  standalone: true,
  selector: 'app-reembolso-seguimiento',
  imports: [CommonModule, StatusBadge, TitleCasePipe, Paginator],
  templateUrl: './reembolso-seguimiento.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 10px; }

    .total-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
    }
    .total-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 14px;
      border: 1px solid var(--color-abril-border);
      border-left: 3px solid #15803D;
      border-radius: var(--radius-md);
      background: #FFFFFF;
    }
    .total-card__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7280;
    }
    .total-card__value { font-size: 22px; font-weight: 700; line-height: 1.1; color: #15803D; }
    .total-card__hint  { font-size: 11px; color: #9CA3AF; }

    .colaborador {
      border: 1px solid var(--color-abril-border);
      border-radius: var(--radius-md);
      background: #FFFFFF;
      overflow: hidden;
    }
    .colaborador__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color .15s ease;
    }
    .colaborador__head:hover { background: #FAFAFA; }
  `],
})
export class ReembolsoSeguimiento implements OnChanges {
  /**
   * Los filtros de la pantalla. Llega como objeto nuevo cada vez que cambian, así que el
   * ngOnChanges alcanza para recargar: no hace falta que la pantalla llame a nada.
   */
  @Input() query: ReembolsoQuery = {};

  data: ReembolsoSeguimientoDto = {
    colaboradores: [], totalAbonado: 0, rendicionesPagadas: 0, colaboradoresCount: 0,
  };

  /** Colaboradores con su detalle abierto. */
  expandidos = new Set<number>();

  private readonly pager = new ClientPager<SeguimientoColaboradorDto>();

  constructor(
    private service: ReembolsosService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) this.load();
  }

  load(): void {
    this.loader.show();
    this.pager.reset();
    this.service.getSeguimiento(this.query).subscribe({
      next: (res) => {
        this.data = res;
        // Con un solo colaborador el detalle es lo que se vino a ver: se abre solo.
        if (res.colaboradores.length === 1) this.expandidos = new Set([res.colaboradores[0].workerId]);
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Paginación ───────────────────────────────────────────────────────
  // La lista llega completa (los filtros y la búsqueda los aplicó el backend): acá solo se
  // recorta la página.

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.data.colaboradores);
  }

  get pagedColaboradores(): SeguimientoColaboradorDto[] {
    return this.pager.page(this.data.colaboradores);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  toggle(c: SeguimientoColaboradorDto): void {
    if (this.expandidos.has(c.workerId)) this.expandidos.delete(c.workerId);
    else                                 this.expandidos.add(c.workerId);
  }

  readonly reembolsoColors = reembolsoColors;
}
