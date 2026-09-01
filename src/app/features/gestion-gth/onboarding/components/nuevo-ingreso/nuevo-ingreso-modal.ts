import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { OnboardingService } from '../../services/onboarding.service';
import { CandidatoApto, OnboardingListItem } from '../../dtos/onboarding.dto';

/**
 * Modal «Nuevo ingreso»: empieza el onboarding de un colaborador.
 *
 * El desplegable lista solo a quienes ya terminaron reclutamiento — candidatos seleccionados cuyo
 * requerimiento quedó cerrado, o sea con su carta oferta firmada y aprobada, y que no tienen otro
 * onboarding abierto —, así que no hay forma de arrancar el onboarding de alguien que todavía está
 * en proceso. Esa lista la calcula el backend y viene con la bandeja.
 *
 * Acá ya no se sube ni se envía nada: la carta oferta es el último paso de Reclutamiento y el
 * onboarding hereda de ella la ficha de la base maestra y el file digital del colaborador. Lo único
 * que se captura es la fecha de ingreso —prellenada con la que quedó pactada en esa carta— y una
 * observación interna.
 */
@Component({
  standalone: true,
  selector: 'app-gth-nuevo-ingreso-modal',
  imports: [
    CommonModule,
    FormsModule,
    AbrilModalPanel,
    SearchSelect,
    DatePicker,
    TitleCasePipe,
  ],
  templateUrl: './nuevo-ingreso-modal.html',
  styleUrl: './nuevo-ingreso-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GthNuevoIngresoModal {
  /** Candidatos aptos (los calcula el backend junto con la bandeja). */
  @Input() candidatos: CandidatoApto[] = [];

  /** Emite el colaborador ya creado; el padre lo inserta en la tabla sin recargar. */
  @Output() creado = new EventEmitter<OnboardingListItem>();
  @Output() closeModal = new EventEmitter<void>();

  candidatoId: number | null = null;
  fechaIngreso: string | null = null;
  observacion = '';

  guardando = false;

  constructor(
    private service: OnboardingService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Opciones del desplegable. El texto junta el nombre con el código del requerimiento porque una
   * misma persona puede haber sido seleccionada en dos procesos distintos y solo el nombre no
   * alcanzaría para distinguirlos.
   */
  get opciones(): { id: number; nombre: string }[] {
    return this.candidatos
      .map((c) => ({ id: c.candidatoId, nombre: `${c.nombre} — ${c.codigo}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get seleccionado(): CandidatoApto | null {
    return this.candidatos.find((c) => c.candidatoId === this.candidatoId) ?? null;
  }

  /** Al elegir al colaborador se prellena la fecha que quedó pactada en su carta oferta. */
  onCandidatoChange(id: number | null): void {
    this.candidatoId = id;
    this.fechaIngreso = this.seleccionado?.fechaIngreso ?? null;
  }

  get puedeEnviar(): boolean {
    return !this.guardando && this.candidatoId !== null;
  }

  /** Motivo por el que el botón está bloqueado, para no dejar a GTH adivinando. */
  get motivoBloqueo(): string | null {
    if (this.candidatoId === null) return 'Elige al colaborador.';
    return null;
  }

  enviar(): void {
    if (!this.puedeEnviar || this.candidatoId === null) return;

    const c = this.seleccionado;

    Swal.fire({
      icon: 'question',
      title: '¿Iniciar el onboarding?',
      html: c
        ? `Se abrirá el proceso de onboarding de <b>${c.nombre}</b> sobre su file digital.`
        : 'Se abrirá el proceso de onboarding de este colaborador.',
      showCancelButton: true,
      confirmButtonText: 'Iniciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (res.isConfirmed) this.guardar();
    });
  }

  private guardar(): void {
    if (this.candidatoId === null) return;

    this.guardando = true;
    this.loaderService.show();

    this.service
      .iniciar({
        candidatoId: this.candidatoId,
        fechaIngreso: this.fechaIngreso,
        observacion: this.observacion.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Onboarding iniciado', text: res.message, confirmButtonColor: '#64BC04' });
          if (res.colaborador) this.creado.emit(res.colaborador);
          this.closeModal.emit();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }
}
