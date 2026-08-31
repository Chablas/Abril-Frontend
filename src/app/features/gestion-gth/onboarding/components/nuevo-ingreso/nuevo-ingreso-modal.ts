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
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../../shared/components/file-preview/file-preview';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { OnboardingService } from '../../services/onboarding.service';
import { CandidatoApto, OnboardingListItem } from '../../dtos/onboarding.dto';

/**
 * Modal «Nuevo ingreso»: empieza el onboarding de un colaborador.
 *
 * El desplegable lista solo a quienes ya terminaron reclutamiento — candidatos seleccionados por el
 * área solicitante cuyo requerimiento quedó cerrado y que no tienen otro onboarding abierto —, así
 * que no hay forma de arrancar un onboarding de alguien que aún está en proceso de selección. Esa
 * lista la calcula el backend y viene con la bandeja.
 *
 * El correo personal NO se pide: sale siempre de la ficha de la base maestra (`person.email`) —
 * igual para un ingreso normal que para un ingreso directo FFT — y se muestra para que GTH lo
 * verifique. Se puede corregir a mano si hace falta, y en ese caso el correo corregido viaja en el
 * request.
 *
 * La carta oferta es obligatoria y tiene que ser un PDF: ya no se envía adjunta, sino que se guarda
 * en el file del colaborador y él la lee y la firma desde un enlace con token. Mostrarla en el
 * navegador y estamparle la firma solo funciona con un PDF.
 */
@Component({
  standalone: true,
  selector: 'app-gth-nuevo-ingreso-modal',
  imports: [
    CommonModule,
    FormsModule,
    AbrilModalPanel,
    SearchSelect,
    FileSelector,
    FilePreview,
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

  /** Correo personal destino. Se prellena con el de la base maestra y GTH lo puede corregir. */
  correo = '';

  carta: File | null = null;
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

  /** Archivo para el `app-file-preview` (la carta es una sola). */
  get cartaPreview(): FilePreviewItem[] {
    if (!this.carta) return [];
    return [{ name: this.carta.name, size: `${(this.carta.size / 1024 / 1024).toFixed(2)} MB` }];
  }

  /**
   * Al elegir al colaborador se prellena su correo personal; GTH puede ajustarlo antes de enviar.
   * La fecha de ingreso se escribe siempre a mano: el requerimiento ya no trae ninguna propuesta.
   */
  onCandidatoChange(id: number | null): void {
    this.candidatoId = id;
    const c = this.seleccionado;
    this.correo = c?.correo ?? '';
    this.fechaIngreso = null;
  }

  onCartaSelected(sel: SelectedFile): void {
    this.carta = sel.file;
  }

  quitarCarta(): void {
    this.carta = null;
  }

  /**
   * Aviso de estado de la ficha de la base maestra: qué le falta al colaborador elegido. Los tres
   * casos (correo, DNI, ficha) salen de esa misma ficha, así que van en una sola línea y no en tres
   * cajas apiladas. El correo se puede escribir a mano en el modal; el DNI y la ficha no (ver
   * `motivoBloqueo`).
   */
  get avisoFichaMaestra(): string | null {
    const c = this.seleccionado;
    if (!c) return null;
    if (!c.tieneFichaMaestra) return 'Sin ficha en la base maestra.';

    const falta: string[] = [];
    if (!c.correo) falta.push('correo personal');
    if (!c.dni) falta.push('documento de identidad');
    if (!falta.length) return null;
    return `Su ficha de la base maestra no tiene ${falta.join(' ni ')}.`;
  }

  get puedeEnviar(): boolean {
    return !this.guardando
      && this.candidatoId !== null
      && this.carta !== null
      && !!this.correo.trim()
      && !!this.seleccionado?.dni
      && !!this.seleccionado?.tieneFichaMaestra;
  }

  /**
   * Motivo por el que el botón está bloqueado, para no dejar a GTH adivinando. Los casos del correo,
   * el DNI y la ficha vacíos son los importantes: significan que el colaborador todavía no tiene
   * ficha en la base maestra —o que la tiene incompleta— y de ahí es de donde salen los tres. El
   * correo se puede escribir a mano; el DNI no, porque es el que nombra la carpeta del colaborador
   * en SharePoint y tiene que ser el mismo que el de su ficha; y la ficha tampoco, porque es donde
   * se guarda la firma que el colaborador va a registrar al abrir el enlace.
   */
  get motivoBloqueo(): string | null {
    if (this.candidatoId === null) return 'Elige al colaborador.';
    if (!this.correo.trim()) return 'Falta el correo personal del colaborador.';
    if (!this.seleccionado?.dni) return 'Sin documento de identidad en la base maestra: con él se crea su carpeta en el file.';
    if (!this.seleccionado?.tieneFichaMaestra) return 'Sin ficha en la base maestra: ahí se guarda la firma que registrará en el enlace.';
    if (!this.carta) return 'Adjunta la carta oferta en PDF.';
    return null;
  }

  enviar(): void {
    if (!this.puedeEnviar || this.candidatoId === null || !this.carta) return;

    const c = this.seleccionado;
    const correo = this.correo.trim().toLowerCase();

    Swal.fire({
      icon: 'question',
      title: '¿Enviar el enlace de la carta oferta?',
      html:
        `Se le enviará a <b>${correo}</b> un correo con el enlace para leer y firmar ` +
        `<b>${this.carta.name}</b> en línea${c ? `, y se iniciará el onboarding de <b>${c.nombre}</b>` : ''}.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.guardar(correo);
    });
  }

  private guardar(correo: string): void {
    if (this.candidatoId === null || !this.carta) return;

    this.guardando = true;
    this.loaderService.show();

    this.service
      .iniciar(
        {
          candidatoId: this.candidatoId,
          fechaIngreso: this.fechaIngreso,
          // Solo se manda si difiere del que resolvió el backend: así el correo de la base maestra
          // sigue siendo la fuente de verdad y este campo es únicamente la corrección manual.
          correo: correo === (this.seleccionado?.correo ?? '').toLowerCase() ? null : correo,
          observacion: this.observacion.trim() || null,
        },
        this.carta,
      )
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
