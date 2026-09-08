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
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { FilePreview } from '../../../../../shared/components/file-preview/file-preview';
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
 * Las actividades con operación real hoy son las dos de «Correo de bienvenida»: el correo al
 * colaborador —que le abre su formulario «Nuevos Talentos»— y el aviso al responsable de obra. El
 * resto del checklist se dibuja para que se vea el proceso completo, y las fases se irán
 * habilitando una por una.
 */
@Component({
  standalone: true,
  selector: 'app-gth-onboarding-detalle-modal',
  imports: [
    CommonModule, AbrilModalPanel, StatusBadge, DatePicker, FileSelector, FilePreview, TitleCasePipe,
  ],
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

  /** Petición del aviso al responsable de obra en vuelo. */
  enviandoAviso = false;

  /** Petición del correo de bienvenida en vuelo. */
  enviandoBienvenida = false;

  /**
   * Fecha límite que se le comunica al colaborador para completar su formulario y mandar su
   * documentación. Arranca en la que ya tenga (si es un reenvío) o a una semana de hoy, que es el
   * plazo con el que trabaja GTH; se puede mover antes de enviar.
   */
  fechaLimite: string | null = null;

  /** Color de acento del date-picker y del selector de archivos (el azul del logotipo del panel). */
  readonly accent = 'var(--color-abril-logo-blue)';

  /**
   * Documentos normativos que se adjuntan al correo de bienvenida (manual de onboarding, RIT,
   * reglamento SST, formatos de cargo). Son opcionales: el correo sale igual sin ellos, solo que
   * sin la línea que los nombra.
   */
  adjuntos: File[] = [];

  readonly adjuntosAccept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';

  /**
   * Tope del conjunto de adjuntos. No es una política nuestra: Graph rechaza el envío cuando el
   * mensaje completo pasa de 4 MB y los adjuntos viajan en base64, que infla ~4/3. El backend
   * valida lo mismo; acá se ataja antes para no hacerle subir 7 MB a nadie por gusto.
   */
  readonly adjuntosMaxBytes = 2_800_000;

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
    this.fechaLimite = this.item.formularioFechaLimite ?? this.fechaLimiteSugerida;
  }

  // ── Correo de bienvenida ────────────────────────────────────────────────

  /** Hoy en formato 'YYYY-MM-DD': es el mínimo del date-picker de la fecha límite. */
  get hoy(): string {
    return this.aIso(new Date());
  }

  /** Una semana desde hoy: el plazo con el que GTH trabaja cuando no elige otro. */
  private get fechaLimiteSugerida(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 7);
    return this.aIso(fecha);
  }

  private aIso(fecha: Date): string {
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Sin correo personal en su ficha maestra no hay a quién escribirle. Es lo único que puede
   * bloquear este envío, y se dice en la tarjeta en vez de dejar que falle al pulsar el botón.
   */
  get bienvenidaBloqueada(): string | null {
    return this.item.bienvenidaEmail
      ? null
      : 'El colaborador no tiene correo personal en su ficha maestra: cárgaselo en Gestión de Ingresos → Trabajadores.';
  }

  // ── Documentos adjuntos del correo de bienvenida ────────────────────────

  /** Lo que la tarjeta de archivos muestra: nombre + peso legible. */
  get adjuntosPreview(): { name: string; size: string }[] {
    return this.adjuntos.map((f) => ({ name: f.name, size: this.pesoLegible(f.size) }));
  }

  get adjuntosBytes(): number {
    return this.adjuntos.reduce((total, f) => total + f.size, 0);
  }

  /** true cuando el conjunto ya no entra en un correo: el botón de enviar se bloquea. */
  get adjuntosExcedidos(): boolean {
    return this.adjuntosBytes > this.adjuntosMaxBytes;
  }

  pesoLegible(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  agregarAdjunto(archivo: SelectedFile): void {
    // Mismo archivo dos veces: el selector no lo sabe, así que se deduplica por nombre y tamaño.
    const repetido = this.adjuntos.some(
      (f) => f.name === archivo.file.name && f.size === archivo.file.size,
    );
    if (repetido) return;
    this.adjuntos = [...this.adjuntos, archivo.file];
  }

  quitarAdjunto(index: number): void {
    this.adjuntos = this.adjuntos.filter((_, i) => i !== index);
  }

  /**
   * Manda el correo de bienvenida. Se confirma antes porque es un correo a alguien de fuera de la
   * organización: una vez enviado no se puede deshacer, solo volver a enviar.
   */
  enviarBienvenida(): void {
    if (this.enviandoBienvenida || this.bienvenidaBloqueada) return;

    if (this.adjuntosExcedidos) {
      Swal.fire({
        icon: 'warning',
        title: 'Los documentos pesan demasiado',
        text: `Los adjuntos suman ${this.pesoLegible(this.adjuntosBytes)} y el correo admite hasta `
            + `${this.pesoLegible(this.adjuntosMaxBytes)}. Quita o comprime alguno.`,
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: this.item.bienvenidaEnviadaEn ? '¿Volver a enviar la bienvenida?' : '¿Enviar la bienvenida?',
      html: `Se le enviará a <b>${this.item.bienvenidaEmail}</b> el enlace de su formulario
             y la documentación que tiene que preparar.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.enviandoBienvenida = true;
      this.loaderService.show();
      this.cdr.detectChanges();

      this.service.enviarBienvenida(this.item.onboardingId, this.fechaLimite, this.adjuntos).subscribe({
        next: (r) => {
          this.enviandoBienvenida = false;
          this.loaderService.hide();
          // Los adjuntos ya viajaron: dejarlos cargados haría que un reenvío los mandara otra vez
          // sin que nadie los volviera a elegir.
          this.adjuntos = [];
          this.aplicar(r.colaborador);
          Swal.fire({ icon: 'success', title: 'Bienvenida enviada', text: r.message });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.enviandoBienvenida = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
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

  // ── Aviso al responsable de obra ────────────────────────────────────────

  /**
   * Manda el correo al coordinador administrativo de la obra. Se confirma antes porque es un correo
   * a alguien de fuera del proceso: una vez enviado no se puede deshacer, solo volver a enviar.
   */
  enviarAvisoObra(): void {
    if (this.enviandoAviso || !this.item.avisoObraAplica) return;

    Swal.fire({
      icon: 'question',
      title: this.item.avisoObraEnviadoEn ? '¿Volver a enviar el aviso?' : '¿Enviar el aviso?',
      html: `Se le avisará a <b>${this.item.avisoObraEmail ?? 'el coordinador administrativo'}</b>
             del ingreso de <b>${this.item.nombre}</b>.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.enviandoAviso = true;
      this.loaderService.show();
      this.cdr.detectChanges();

      this.service.enviarAvisoObra(this.item.onboardingId).subscribe({
        next: (r) => {
          this.enviandoAviso = false;
          this.loaderService.hide();
          this.aplicar(r.colaborador);
          Swal.fire({ icon: 'success', title: 'Aviso enviado', text: r.message });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.enviandoAviso = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  /** Deja la fila actualizada en el modal y avisa al padre para que la reemplace en la tabla. */
  private aplicar(colaborador: OnboardingListItem | null): void {
    if (!colaborador) return;
    this.item = colaborador;
    // La fecha límite que quedó registrada manda sobre la que estaba en pantalla: si se reenvía,
    // el campo tiene que mostrar el plazo vigente y no el que se tipeó antes.
    this.fechaLimite = colaborador.formularioFechaLimite ?? this.fechaLimite;
    this.actualizado.emit(colaborador);
  }
}
