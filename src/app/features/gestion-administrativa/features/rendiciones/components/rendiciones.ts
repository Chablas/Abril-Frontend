import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { RendicionesService } from '../services/rendiciones.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  PeriodoOptionDto,
  RendicionListItemDto,
  ResumenRendicionesDto,
} from '../dtos/rendicion.dto';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import { confirmarConCorreos } from '../../../shared/confirmar-correos';
import { primeraRevisionColors, reembolsoColors } from '../../../shared/dtos/rendicion-shared.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { RendicionDetalleModal } from './rendicion-detalle-modal/rendicion-detalle-modal';
import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';

/**
 * "Mis Rendiciones": las planillas que el trabajador ya rindió. Lo que le toca es enviarlas a la
 * primera revisión de su jefatura y subsanarlas si vuelven observadas. Después de esa aprobación el
 * trámite del S10 —adjuntar el consolidado, avisar a la jefatura, pedir la corrección al ERP— es del
 * consolidador de su área (Gestión de Rendiciones y Consolidados): acá solo se sigue hasta el pago.
 *
 * Existe como pantalla aparte de Solicitud de Salidas porque una planilla puede agrupar varias
 * salidas: repetir esos botones fila por fila hacía que el mismo documento se pidiera N veces.
 */
@Component({
  standalone: true,
  selector: 'app-rendiciones',
  imports: [
    CommonModule, DatePipe, StatusBadge, SearchSelect, AbrilPageHeaderComponent,
    FilterTriggerButton, FilterModal, RendicionDetalleModal,
  ],
  templateUrl: './rendiciones.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    /* ── Tarjetas de resumen ────────────────────────────────────────────────
       Mismo lenguaje visual que las otras pantallas de salidas, y con el mismo criterio: cuentan
       el conjunto que muestra la tabla, así que se mueven con los filtros. Acá son los dos pasos
       que le pueden faltar al trabajador. */
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
    .resumen-card--primary { border-left-color: #005D9D; }
    .resumen-card--primary .resumen-card__value { color: #005D9D; }
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

  /**
   * True cuando el detalle se abre para subsanar: cada salida muestra ahí su botón de corregir
   * capturas y montos. Se resuelve acá y no en el modal porque es la fila la que sabe si su
   * rendición volvió observada.
   */
  detalleSubsanando = false;

  /**
   * Números de las tarjetas. Los cuenta el backend sobre el MISMO conjunto que muestra la tabla,
   * así que llegan con el listado y cambian con cada filtro.
   */
  resumen: ResumenRendicionesDto = { porEnviar: 0, observadas: 0 };

  // ── Correos que dispara la pantalla ───────────────────────────────
  //
  // Los destinatarios REALES de "Enviar a revisión" (aviso a la jefatura y acuse al trabajador), ya
  // resueltos por el backend aplicando Configuración → Correos. Son los mismos para toda la
  // pantalla —está acotada a un solo trabajador—, así que llegan con los datos de arranque y no con
  // cada fila ni con cada filtro. Se pasan también al modal de detalle, que dispara los mismos
  // correos desde su botón.
  correosEnvioRevision: CorreoAvisoDto[] = [];

  // ── Filtros ────────────────────────────────────────────────────────
  periodoOptions: { key: string | null; label: string }[] = [{ key: null, label: 'Todos los periodos' }];
  private periodos: PeriodoOptionDto[] = [];

  readonly estadoPrimeraRevisionOptions = [
    { value: null,                  label: 'Todas' },
    { value: 'Lista para enviar',   label: 'Por enviar' },
    { value: 'En primera revisión', label: 'En revisión' },
    { value: 'Observada',           label: 'Observadas' },
    { value: 'Aprobada',            label: 'Aprobadas' },
  ];

  readonly estadoReembolsoOptions = [
    { value: null,         label: 'Todos' },
    { value: 'Pendiente',  label: 'Por revisar' },
    { value: 'Observado',  label: 'Observadas' },
    { value: 'Aprobado',   label: 'Aprobadas' },
    { value: 'Firmado',    label: 'Firmadas' },
    { value: 'Proceder con el reembolso', label: 'En Tesorería' },
    { value: 'Pagado',     label: 'Pagadas' },
  ];
  readonly consolidadoOptions = [
    { value: null,  label: 'Todas' },
    { value: 'no',  label: 'Sin consolidado' },
    { value: 'si',  label: 'Con consolidado' },
  ];

  filters = {
    estadoPrimeraRevision: null as string | null,
    estadoReembolso: null as string | null,
    consolidado:     null as string | null,
    periodoKey:      null as string | null,
  };

  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.estadoPrimeraRevision != null) n++;
    if (this.filters.estadoReembolso != null) n++;
    if (this.filters.consolidado != null)     n++;
    if (this.filters.periodoKey != null)      n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filters = {
      estadoPrimeraRevision: null, estadoReembolso: null, consolidado: null, periodoKey: null,
    };
    this.load();
  }

  constructor(
    private service: RendicionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Botón "Configuración" del header ─────────────────────────────────
  // Lleva a la configuración de ESTA pantalla: el correo de enviar la planilla a primera revisión.
  // Se restringe con la misma feature que antes protegía la sección Correos: quien no la tiene no
  // ve el botón.

  private static readonly FEATURE_CONFIG_CORREOS = 'gestion-administrativa.config.correos';

  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(Rendiciones.FEATURE_CONFIG_CORREOS);
  }

  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-administrativa/rendiciones/configuracion']);
  }

  ngOnInit(): void {
    this.loadFilterData();
    this.load();

    // Enlace directo de los correos de la primera revisión ("Subsanar observaciones" / "Ver mi
    // rendición"): abre esa planilla sin que el trabajador tenga que buscarla.
    const rendicionId = Number(this.route.snapshot.queryParamMap.get('rendicion'));
    if (rendicionId > 0) this.detalleId = rendicionId;
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.periodos = data.periodos ?? [];
        // Los correos vienen en esta misma carga: se refrescan después de cada acción (recargar()
        // la vuelve a llamar) sin una petición aparte.
        this.correosEnvioRevision = data.correosEnvioRevision ?? [];
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
      this.filters.estadoPrimeraRevision,
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
    this.detalleSubsanando = r.puedeSubsanar;
  }

  /** Abre el detalle en modo subsanación desde el botón de la fila. */
  corregirCapturas(r: RendicionListItemDto, ev: Event): void {
    ev.stopPropagation();
    this.detalleId = r.id;
    this.detalleSubsanando = true;
  }

  cerrarDetalle(cambio: boolean): void {
    this.detalleId = null;
    this.detalleSubsanando = false;
    if (cambio) this.recargar();
    else        this.cdr.detectChanges();
  }

  // ── Primera revisión ─────────────────────────────────────────────────

  /**
   * Envía la planilla a la primera revisión de la jefatura. Se confirma porque a partir de ahí el
   * documento está en manos del jefe y el trabajador ya no puede tocar sus montos.
   */
  async enviarPrimeraRevision(r: RendicionListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation();

    const result = await confirmarConCorreos({
      titulo: '¿Enviar ' + r.codigo + ' a revisión?',
      avisos: this.correosEnvioRevision,
      // Sin nadie a quien avisar el envío igual procede: la rendición pasa a revisión y el jefe la
      // ve en su bandeja. Es un aviso de estado, no un bloqueo.
      sinNadie: 'Pasa a revisión, pero sin aviso por correo: está apagado en Configuración → Correos.',
      confirmButtonText: 'Sí, enviar',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.enviarPrimeraRevision(r.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message, timer: 2400, showConfirmButton: false });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Vuelve a generar la planilla de una rendición observada, ya con las capturas y los montos
   * corregidos. Conserva el código, descarga el PDF nuevo y la deja lista para reenviar.
   */
  async regenerarPlanilla(r: RendicionListItemDto, ev: Event): Promise<void> {
    ev.stopPropagation();

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Volver a generar ' + r.codigo + '?',
      text: 'Queda lista para reenviar a revisión.',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.regenerarPlanilla(r.id).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.descargar(res, r.codigo + '.pdf');
        Swal.fire({
          icon: 'success',
          title: 'Planilla regenerada',
          text: r.codigo + ' quedó lista para enviar de nuevo a revisión.',
          timer: 2800,
          showConfirmButton: false,
        });
        this.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Dispara la descarga del PDF que devuelve el backend. */
  private descargar(response: HttpResponse<Blob>, filename: string): void {
    if (!response.body) return;
    const url = URL.createObjectURL(response.body);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Colores de estado ────────────────────────────────────────────────

  readonly primeraRevisionColors = primeraRevisionColors;

  /** Tooltip del badge de la primera revisión: lo único que importa es la observación. */
  primeraRevisionTitle(r: RendicionListItemDto): string | null {
    if (r.estadoPrimeraRevision === 'Observada' && r.primeraRevisionObservacion) {
      return 'Observación: ' + r.primeraRevisionObservacion;
    }
    if (r.estadoPrimeraRevision === 'Lista para enviar') {
      return 'Todavía no la enviaste a tu jefe para la primera revisión.';
    }
    return null;
  }

  // Los colores del estado del reembolso viven en el shared del módulo: el mismo estado tiene
  // que verse igual en las cinco pantallas del ciclo.
  readonly reembolsoColors = reembolsoColors;

  /** El estado ya se llama "Observado" en el backend: la fila lo imprime tal cual. */
  reembolsoTexto(r: RendicionListItemDto): string {
    return r.estadoReembolso;
  }

  reembolsoTitle(r: RendicionListItemDto): string | null {
    const partes: string[] = [];
    if (r.estadoReembolso === 'Observado' && r.observacionReembolso) {
      const de = r.observacionReembolsoOrigen ? ` de ${r.observacionReembolsoOrigen}` : '';
      partes.push(`Observación${de}: ${r.observacionReembolso}`);
    }
    if (r.reembolsoMixto) {
      partes.push('Tus salidas de esta planilla no están todas en el mismo estado: se muestra la más atrasada.');
    }
    return partes.length ? partes.join(' · ') : null;
  }
}
