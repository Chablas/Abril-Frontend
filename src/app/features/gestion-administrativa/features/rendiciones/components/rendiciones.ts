import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { RendicionesService } from '../services/rendiciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  PeriodoOptionDto,
  RendicionListItemDto,
  ResumenRendicionesDto,
} from '../dtos/rendicion.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { ConsolidadoS10Modal } from '../../../shared/components/consolidado-s10-modal/consolidado-s10-modal';
import { ConsolidadoS10Dto } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';
import { RendicionDetalleModal } from './rendicion-detalle-modal/rendicion-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/**
 * "Mis Rendiciones": las planillas que el trabajador ya rindió y todo lo que viene DESPUÉS de
 * rendir — adjuntar el Consolidado del S10, avisarle al revisor y seguir el reembolso hasta la
 * copia firmada.
 *
 * Existe como pantalla aparte de Solicitud de Salidas porque una planilla puede agrupar varias
 * salidas: repetir esos botones fila por fila hacía que el mismo documento se pidiera N veces.
 */
@Component({
  standalone: true,
  selector: 'app-rendiciones',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, ConsolidadoS10Modal, RendicionDetalleModal,
  ],
  templateUrl: './rendiciones.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* ── Tarjetas de resumen ────────────────────────────────────────────────
       Mismo lenguaje visual que las otras dos pantallas de salidas, y con el mismo criterio:
       cuentan el conjunto que muestra la tabla, así que se mueven con los filtros. Acá las tres
       son los pasos que le pueden faltar al trabajador, en el orden del flujo. */
    .resumen-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
    }
    .resumen-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 14px;
      border: 1px solid var(--color-abril-border);
      border-left: 3px solid var(--color-abril-border-strong);
      border-radius: var(--radius-md);
      background: #FFFFFF;
    }
    .resumen-card__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7280;
    }
    .resumen-card__value { font-size: 22px; font-weight: 700; line-height: 1.1; color: var(--color-abril-ink); }
    .resumen-card__hint  { font-size: 11px; color: #9CA3AF; }
    .resumen-card--warn  { border-left-color: var(--color-abril-warning); }
    .resumen-card--warn  .resumen-card__value { color: var(--color-abril-warning-dark); }
    .resumen-card--info  { border-left-color: var(--color-abril-standard); }
    .resumen-card--info  .resumen-card__value { color: var(--color-abril-standard); }
    .resumen-card--alert { border-left-color: var(--color-abril-danger); }
    .resumen-card--alert .resumen-card__value { color: var(--color-abril-danger-dark); }

    /* Enlaces a los PDF de la fila (planilla, copia firmada, consolidado). Van como chips y no
       como botones: son documentos que se abren, no acciones que cambian algo. */
    .doc-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid var(--color-abril-border);
      border-radius: 4px;
      background: #FFFFFF;
      color: #6B7280;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease;
    }
    .doc-chip:hover {
      border-color: var(--color-abril-standard);
      color: var(--color-abril-standard);
    }
    .doc-chip--pendiente {
      border-style: dashed;
      color: #9CA3AF;
    }
  `],
})
export class Rendiciones implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  rendiciones: RendicionListItemDto[] = [];

  /** ID de la planilla cuyo modal de detalle está abierto. null = cerrado. */
  detalleId: number | null = null;

  /** Planilla cuyo modal de Consolidado del S10 está abierto. null = cerrado. */
  consolidadoDe: RendicionListItemDto | null = null;

  /**
   * Números de las tarjetas. Los cuenta el backend sobre el MISMO conjunto que muestra la tabla,
   * así que llegan con el listado y cambian con cada filtro.
   */
  resumen: ResumenRendicionesDto = { sinConsolidado: 0, porAvisar: 0, observadas: 0 };

  // ── Filtros ────────────────────────────────────────────────────────
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  readonly estadoReembolsoOptions = [
    { value: null,         label: 'Todos' },
    { value: 'Pendiente',  label: 'Por revisar' },
    { value: 'Rechazado',  label: 'Observadas' },
    { value: 'Aprobado',   label: 'Aprobadas' },
    { value: 'Firmado',    label: 'Firmadas' },
    { value: 'Pagado',     label: 'Pagadas' },
  ];
  readonly consolidadoOptions = [
    { value: null,  label: 'Todas' },
    { value: 'no',  label: 'Sin consolidado' },
    { value: 'si',  label: 'Con consolidado' },
  ];

  filters = {
    estadoReembolso: null as string | null,
    consolidado:     null as string | null,
    periodoKey:      null as string | null,
  };

  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.consolidado != null)     n++;
    if (this.filters.periodoKey != null)      n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = { estadoReembolso: null, consolidado: null, periodoKey: null };
    this.load();
  }

  constructor(
    private service: RendicionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();

    // Enlace directo de los correos del reembolso ("Subsanar observaciones" / "Ver mi
    // rendición"): abre esa planilla sin que el trabajador tenga que buscarla.
    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (rendicionId > 0) this.detalleId = rendicionId;
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.periodos = data.periodos ?? [];
        this.periodoOptions = [
          { key: null, label: 'Todos los periodos' },
          ...this.periodos.map((p) => ({ key: this.periodoKey(p.anio, p.mes), label: p.label })),
        ];
        // Si el periodo elegido ya no existe se apaga solo: dejarlo puesto mostraría una tabla
        // vacía sin decir por qué.
        if (this.filters.periodoKey && !this.periodos.some((p) => this.periodoKey(p.anio, p.mes) === this.filters.periodoKey)) {
          this.filters.periodoKey = null;
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private periodoKey(anio: number, mes: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private get periodoSeleccionado(): PeriodoOptionDto | null {
    if (!this.filters.periodoKey) return null;
    return this.periodos.find((p) => this.periodoKey(p.anio, p.mes) === this.filters.periodoKey) ?? null;
  }

  load(): void {
    this.loaderService.show();
    const periodo = this.periodoSeleccionado;
    this.service.getMisRendiciones(
      this.filters.estadoReembolso,
      this.filters.consolidado == null ? null : this.filters.consolidado === 'si',
      periodo?.anio ?? null,
      periodo?.mes ?? null,
    ).subscribe({
      next: (res) => {
        this.rendiciones = res.data;
        // Las tarjetas se cuentan sobre este mismo conjunto filtrado: llegan con el listado, así
        // que un cambio de filtro las mueve sin una petición extra.
        this.resumen = res.resumen;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Recarga la tabla (con sus tarjetas) y las opciones del filtro. Se usa después de cada acción
   * que mueve el estado: los periodos salen de `filter-data` y una planilla nueva o un cambio de
   * estado puede agregar o quitar opciones.
   */
  private recargar(): void {
    this.load();
    this.loadFilterData();
  }

  // ── Detalle ──────────────────────────────────────────────────────────

  abrirDetalle(r: RendicionListItemDto): void {
    this.detalleId = r.id;
  }

  cerrarDetalle(cambio: boolean): void {
    this.detalleId = null;
    if (cambio) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Consolidado del S10 ──────────────────────────────────────────────

  abrirConsolidado(r: RendicionListItemDto, ev: Event): void {
    ev.stopPropagation(); // no abrir el detalle
    this.consolidadoDe = r;
  }

  /** Función de subida que consume el modal compartido (ya sabe a qué endpoint pegarle). */
  readonly subirConsolidado = (file: File) =>
    this.service.uploadConsolidadoS10(this.consolidadoDe!.id, file);

  /** Referencia que muestra el modal para que se vea a qué planilla se está adjuntando. */
  get consolidadoReferencia(): string | null {
    const r = this.consolidadoDe;
    if (!r) return null;
    return r.numeroPlanilla ?? `Rendición del ${new Date(r.rendidoAt).toLocaleDateString('es-PE')}`;
  }

  cerrarConsolidado(subido: ConsolidadoS10Dto | null): void {
    this.consolidadoDe = null;
    if (subido) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Aviso al revisor ─────────────────────────────────────────────────

  /**
   * Avisa al jefe/revisor que el Consolidado del S10 de la planilla ya está adjunto. Se puede
   * repetir a propósito (un correo se pierde, el jefe lo archiva sin leer): la fecha del último
   * aviso queda a la vista en el botón para que no se convierta en insistencia a ciegas.
   */
  async notificarRevisor(r: RendicionListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation(); // no abrir el detalle

    if (r.revisorNotificadoAt) {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Volver a avisar?',
        text: 'Ya le avisaste a tu revisor por esta planilla. Se le enviará el correo otra vez.',
        showCancelButton: true,
        confirmButtonText: 'Sí, avisar de nuevo',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F6E56',
      });
      if (!result.isConfirmed) return;
    }

    this.loaderService.show();
    this.service.notificarRevisor(r.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Colores de estado ────────────────────────────────────────────────

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }

  /** El badge dice "Observado" y no "Rechazado": lo que el trabajador tiene que hacer es subsanar. */
  reembolsoTexto(r: RendicionListItemDto): string {
    return r.estadoReembolso === 'Rechazado' ? 'Observado' : r.estadoReembolso;
  }

  reembolsoTitle(r: RendicionListItemDto): string | null {
    const partes: string[] = [];
    if (r.estadoReembolso === 'Rechazado' && r.observacionReembolso) {
      partes.push(`Observación: ${r.observacionReembolso}`);
    }
    if (r.reembolsoMixto) {
      partes.push('Tus salidas de esta planilla no están todas en el mismo estado: se muestra la más atrasada.');
    }
    return partes.length ? partes.join(' · ') : null;
  }
}
