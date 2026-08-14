import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { Seguimiento } from '../../dtos/solicitud-personal.dto';
import { CandidatoRechazado, etapaRechazoColors } from '../../../shared/dtos/candidato-rechazado.dto';

/**
 * Modal "Estado del reclutamiento" (solo lectura): cabecera con datos clave del
 * requerimiento + línea de tiempo vertical de las fases del pipeline. Se abre desde
 * el botón "Hacer seguimiento" de la tabla "Mis solicitudes de vacante".
 */
@Component({
  standalone: true,
  selector: 'app-gth-seguimiento',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, SearchInput, Paginator, TitleCasePipe],
  templateUrl: './seguimiento.html',
})
export class GthSeguimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();

  seguimiento: Seguimiento | null = null;

  // ── Historial de candidatos rechazados ──────────────────────────────────
  /** Colores del badge de la etapa en la que se rechazó a un candidato del historial. */
  etapaColors = etapaRechazoColors;

  /** Búsqueda del historial de rechazados (nombre del candidato o etapa del rechazo). */
  busquedaRechazados = '';

  private readonly pagerRechazados = new ClientPager<CandidatoRechazado>();

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getSeguimiento(this.requerimientoId).subscribe({
      next: (data) => {
        this.seguimiento = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.seguimiento) return '';
    const puesto = this.titleCase(this.seguimiento.puesto);
    return puesto ? `${this.seguimiento.codigo} · ${puesto}` : this.seguimiento.codigo;
  }

  /**
   * Etiqueta principal de la tarjeta "Aprobaciones": la decisión de GERENCIA GENERAL sobre ESTA
   * vacante si ya la hay, o el estado mientras siga pendiente. Es la que manda — sin ella la
   * vacante no avanza, por eso ocupa el lugar destacado.
   */
  get aprobacionGgLabel(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return 'No requerida';
    if (ap.aprobado === true) return 'Aprobada';
    if (ap.aprobado === false) return 'Rechazada';
    return ap.enviadoEn ? 'Pendiente' : 'Correo sin enviar';
  }

  /** Color de la etiqueta principal (verde aprobada, rojo rechazada, ámbar pendiente). */
  get aprobacionGgColor(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return '#6B7280';
    if (ap.aprobado === true) return '#15803D';
    if (ap.aprobado === false) return '#B91C1C';
    return '#B45309';
  }

  /** Detalle bajo la etiqueta: cuándo decidió Gerencia General, o a qué está esperando. */
  get aprobacionGgDetalle(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return 'Registrada antes de este paso del flujo';
    if (ap.decididoEn) return `Gerencia General · ${this.fecha(ap.decididoEn)}`;
    return ap.enviadoEn
      ? `Enviada a los gerentes el ${this.fecha(ap.enviadoEn)}`
      : 'No se pudo enviar el correo; usa «Reenviar a Gerencia General»';
  }

  /**
   * Segunda línea de la tarjeta: el visto bueno del gerente del área sobre ESTA vacante. Es
   * redundante para el flujo (no lo bloquea) pero el solicitante quiere saber si su gerente ya
   * respaldó la solicitud. Null cuando no hay aprobación registrada.
   */
  get aprobacionAreaLabel(): string | null {
    const ap = this.seguimiento?.aprobacionGg;
    if (!ap) return null;
    if (ap.aprobadoGerenteArea === true) return 'Gerente del área: aprobada';
    if (ap.aprobadoGerenteArea === false) return 'Gerente del área: rechazada';
    return 'Gerente del área: sin visto bueno';
  }

  /** Color de esa segunda línea; gris mientras el gerente del área no opine. */
  get aprobacionAreaColor(): string {
    const ap = this.seguimiento?.aprobacionGg;
    if (ap?.aprobadoGerenteArea === true) return '#15803D';
    if (ap?.aprobadoGerenteArea === false) return '#B91C1C';
    return '#9CA3AF';
  }

  /** Comentario que dejó Gerencia General al decidir (si hay). */
  get aprobacionGgComentario(): string | null {
    return this.seguimiento?.aprobacionGg?.comentario ?? null;
  }

  /** Comentario que dejó el gerente del área en su visto bueno (si hay). */
  get aprobacionAreaComentario(): string | null {
    return this.seguimiento?.aprobacionGg?.gerenteAreaComentario ?? null;
  }

  // ── Historial de candidatos rechazados ──────────────────────────────────
  /** Volver a la primera página al cambiar la búsqueda (si no, se quedaría en una vacía). */
  onBuscarRechazados(): void {
    this.pagerRechazados.reset();
  }

  get rechazadosFiltrados(): CandidatoRechazado[] {
    const rechazados = this.seguimiento?.candidatosRechazados ?? [];
    if (!this.busquedaRechazados.trim()) return rechazados;
    return rechazados.filter(
      (c) =>
        SearchInput.matches(c.nombre, this.busquedaRechazados) ||
        SearchInput.matches(c.etapaNombre, this.busquedaRechazados),
    );
  }

  get rechazadosPagina(): CandidatoRechazado[] {
    return this.pagerRechazados.page(this.rechazadosFiltrados);
  }

  get rechazadosPaginaActual(): number {
    return this.pagerRechazados.currentPage;
  }

  get rechazadosTotalPaginas(): number {
    return this.pagerRechazados.totalPages(this.rechazadosFiltrados);
  }

  cambiarPaginaRechazados(page: number): void {
    this.pagerRechazados.goTo(page);
  }

  private fecha(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
  }

  private titleCase(value: string | null | undefined): string {
    return value ? new TitleCasePipe().transform(value) : '';
  }
}
