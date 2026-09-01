import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { OnboardingService } from '../../services/onboarding.service';
import { FaseOnboarding, OnboardingListItem } from '../../dtos/onboarding.dto';
import { avanceColor, estadoOnboardingColors } from '../../onboarding-estado-colors';
import {
  ACTIVIDAD,
  ActividadEstado,
  AvanceChecklist,
  actividadesDeFase,
  avanceChecklist,
  faseCompletada,
  hechasEnFase,
} from '../../onboarding-checklist';

/**
 * Detalle del onboarding de un colaborador: se abre al hacer clic en una fila de la tabla.
 *
 * Muestra las «Fases» del proceso y, debajo, el checklist operativo de la fase que se está viendo.
 * Se puede navegar hacia atrás y hacia adelante entre las fases ya alcanzadas para ver el historial;
 * las fases futuras quedan bloqueadas (RF-ONB-26: solo se muestran las fases alcanzadas y el
 * siguiente paso).
 *
 * Ninguna fase tiene operación real todavía: la carta oferta —que era la única— pasó a ser el
 * último paso de Reclutamiento. El checklist se dibuja para que se vea el proceso completo, y las
 * fases se irán habilitando una por una.
 */
@Component({
  standalone: true,
  selector: 'app-gth-onboarding-detalle-modal',
  imports: [CommonModule, AbrilModalPanel, StatusBadge, TitleCasePipe],
  templateUrl: './onboarding-detalle-modal.html',
  styleUrl: './onboarding-detalle-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GthOnboardingDetalleModal implements OnInit {
  /** Fila de la tabla que se abrió. Se mantiene una copia local que se actualiza con cada acción. */
  @Input({ required: true }) colaborador!: OnboardingListItem;

  /** Catálogo de fases con su checklist (viene de la bandeja). */
  @Input() fases: FaseOnboarding[] = [];

  /** Emite la fila ya actualizada; el padre la reemplaza en la tabla sin recargar la bandeja. */
  @Output() actualizado = new EventEmitter<OnboardingListItem>();
  @Output() closeModal = new EventEmitter<void>();

  item!: OnboardingListItem;

  /** Fase que se está viendo (por `orden`), independiente de en cuál está parado el colaborador. */
  faseVista = 1;

  avanzando = false;

  readonly ACTIVIDAD = ACTIVIDAD;
  estadoColors = estadoOnboardingColors;
  avanceColor = avanceColor;

  constructor(
    private service: OnboardingService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.item = { ...this.colaborador };
    this.faseVista = this.item.faseOrden;
  }

  // ── Fases ───────────────────────────────────────────────────────────────

  get fase(): FaseOnboarding | null {
    return this.fases.find((f) => f.orden === this.faseVista) ?? null;
  }

  get totalFases(): number {
    return this.fases.length;
  }

  /** True si la fase ya quedó atrás para este colaborador. */
  completada(fase: FaseOnboarding): boolean {
    return faseCompletada(fase, this.item);
  }

  /** Actividades hechas en una fase (el número que va bajo su círculo). */
  hechas(fase: FaseOnboarding): number {
    return hechasEnFase(fase, this.item);
  }

  /** Solo se puede entrar a las fases ya alcanzadas: las futuras aún no tienen nada que mostrar. */
  alcanzada(fase: FaseOnboarding): boolean {
    return fase.orden <= this.item.faseOrden;
  }

  irAFase(fase: FaseOnboarding): void {
    if (this.alcanzada(fase)) this.faseVista = fase.orden;
  }

  // ── Checklist de la fase que se está viendo ─────────────────────────────

  get actividades(): ActividadEstado[] {
    const fase = this.fase;
    return fase ? actividadesDeFase(fase, this.item) : [];
  }

  get hechasEnVista(): number {
    const fase = this.fase;
    return fase ? hechasEnFase(fase, this.item) : 0;
  }

  /**
   * Conteos del checklist. El PORCENTAJE no se calcula acá: se usa `item.avancePorcentaje`, que ya
   * viene del backend, para que la tabla y el detalle no puedan mostrar dos números distintos.
   */
  get avance(): AvanceChecklist {
    return avanceChecklist(this.fases, this.item);
  }

  /** True cuando se está viendo la fase en la que el colaborador está parado (la operable). */
  get viendoFaseActual(): boolean {
    return this.faseVista === this.item.faseOrden;
  }

  // ── Navegación del pie del modal ────────────────────────────────────────

  get puedeRetroceder(): boolean {
    return this.faseVista > 1;
  }

  retroceder(): void {
    if (this.puedeRetroceder) this.faseVista--;
  }

  /**
   * Qué hace el botón de la derecha: navegar por el historial cuando se está viendo una fase ya
   * pasada, o cerrar la fase actual y pasar a la siguiente cuando se está en la que toca.
   */
  get etiquetaAvanzar(): string {
    if (!this.viendoFaseActual) return 'Fase siguiente';
    return this.esUltimaFase ? 'Onboarding completo' : 'Continuar';
  }

  get esUltimaFase(): boolean {
    return this.item.faseOrden >= this.totalFases;
  }

  get puedeAvanzar(): boolean {
    if (this.avanzando) return false;
    if (!this.viendoFaseActual) return true;
    return this.motivoBloqueo === null;
  }

  /** Por qué no se puede continuar todavía (va como tooltip del botón). */
  get motivoBloqueo(): string | null {
    if (!this.viendoFaseActual) return null;
    if (this.esUltimaFase) return 'El onboarding ya está en su última fase.';
    return `La fase «${this.fase?.nombre}» todavía no está habilitada para avanzar desde el sistema.`;
  }

  avanzar(): void {
    if (!this.puedeAvanzar) return;

    // Historial: solo se mueve la vista, no el proceso.
    if (!this.viendoFaseActual) {
      this.faseVista++;
      return;
    }

    this.avanzando = true;
    this.loaderService.show();

    this.service.avanzarFase(this.item.onboardingId).subscribe({
      next: (res) => {
        this.avanzando = false;
        this.loaderService.hide();
        this.aplicar(res.colaborador);
        if (res.colaborador) this.faseVista = res.colaborador.faseOrden;
        Swal.fire({ icon: 'success', title: 'Fase completada', text: res.message });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.avanzando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Deja la fila actualizada en el modal y avisa al padre para que la reemplace en la tabla. */
  private aplicar(colaborador: OnboardingListItem | null): void {
    if (!colaborador) return;
    this.item = colaborador;
    this.actualizado.emit(colaborador);
  }
}
