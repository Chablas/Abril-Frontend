import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AprobacionesService } from '../../services/aprobaciones.service';
import { estadoAprobacionColors } from '../../estado-aprobacion-colors';
import {
  AprobacionDetalle,
  AprobacionNivelResumen,
  AprobacionVacante,
} from '../../dtos/aprobaciones.dto';
import { DestinatarioSolicitud } from '../../../shared/dtos/destinatarios.dto';

/**
 * Modal de decisión sobre una solicitud de personal: la solicitud completa con sus vacantes y, en
 * cada una, Aprobar o Rechazar.
 *
 * La solicitud tiene DOS casillas —el visto bueno del gerente del área y la aprobación de Gerencia
 * General— y el usuario solo marca la suya (`data.nivel`, que el backend resuelve desde la
 * categoría de su ficha). La del otro nivel se muestra como información en todo momento: saber que
 * el gerente del área ya observó una vacante es justo el contexto que necesita el GG para decidir.
 *
 * Solo la decisión de Gerencia General manda las vacantes aprobadas a Gestión de Talento Humano.
 * Si el nivel del usuario ya decidió, el modal abre en lectura — es también la ficha del historial.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobacion-decision',
  imports: [CommonModule, FormsModule, AbrilModalPanel, TitleCasePipe],
  templateUrl: './decision.html',
  styleUrl: './decision.css',
})
export class GthAprobacionDecision implements OnInit {
  /** Aprobación a decidir (o a consultar, si el nivel del usuario ya decidió). */
  @Input({ required: true }) aprobacionId!: number;

  @Output() closeModal = new EventEmitter<void>();
  /** Se emite tras registrar la decisión, para que la lista se recargue. */
  @Output() decided = new EventEmitter<void>();

  data: AprobacionDetalle | null = null;
  cargando = true;
  enviando = false;

  /** Decisión en curso por requerimiento: true = aprobar, false = rechazar, undefined = sin elegir. */
  decisiones = new Map<number, boolean>();

  comentario = '';

  readonly estadoColors = estadoAprobacionColors;

  constructor(
    private service: AprobacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    // App zoneless: hay que forzar el refresco tras el subscribe o la vista no se actualiza.
    this.service.getDetalle(this.aprobacionId).subscribe({
      next: (data) => {
        this.data = data;
        // En lectura se muestra lo que quedó registrado en MI casilla, no lo que dijo el otro nivel.
        if (!data.puedeDecidir) {
          this.comentario = this.miCasilla?.comentario ?? '';
          for (const v of data.vacantes) {
            const mia = this.decisionRegistrada(v);
            if (mia !== null) this.decisiones.set(v.requerimientoId, mia);
          }
        }
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  // ── Nivel del usuario y las dos casillas ────────────────────────────────
  get esGerenteGeneral(): boolean {
    return this.data?.nivel === 'GERENTE_GENERAL';
  }

  /** Casilla que el usuario puede marcar. */
  get miCasilla(): AprobacionNivelResumen | null {
    if (!this.data) return null;
    return this.esGerenteGeneral ? this.data.gerenteGeneral : this.data.gerenteArea;
  }

  /** Casilla del otro nivel: solo se muestra, nunca se edita. */
  get otraCasilla(): AprobacionNivelResumen | null {
    if (!this.data) return null;
    return this.esGerenteGeneral ? this.data.gerenteArea : this.data.gerenteGeneral;
  }

  get miNivelLabel(): string {
    return this.esGerenteGeneral ? 'Gerencia General' : 'Gerente del área';
  }

  get otroNivelLabel(): string {
    return this.esGerenteGeneral ? 'Gerente del área' : 'Gerencia General';
  }

  get titulo(): string {
    if (this.soloLectura) return 'Decisión registrada';
    return this.esGerenteGeneral
      ? 'Aprobación de solicitud de personal'
      : 'Visto bueno de la solicitud de personal';
  }

  /** Aviso de arriba: qué se espera del usuario, o por qué ya no puede tocar nada. */
  get avisoInstruccion(): string {
    return this.esGerenteGeneral
      ? 'Marca Aprobar o Rechazar en cada vacante. Solo las aprobadas se envían a Gestión de Talento Humano.'
      : 'Marca Aprobar o Rechazar en cada vacante. Tu visto bueno queda registrado; la solicitud avanza recién con la aprobación de Gerencia General.';
  }

  // ── Decisión por vacante ────────────────────────────────────────────────
  get vacantes(): AprobacionVacante[] {
    return this.data?.vacantes ?? [];
  }

  get soloLectura(): boolean {
    return !this.data?.puedeDecidir;
  }

  /** Lo que MI nivel dejó registrado en esta vacante (null si aún no decidió). */
  decisionRegistrada(v: AprobacionVacante): boolean | null {
    return this.esGerenteGeneral ? v.aprobadoGerenteGeneral : v.aprobadoGerenteArea;
  }

  /** Lo que el OTRO nivel dejó registrado en esta vacante (null si no opinó). */
  decisionOtroNivel(v: AprobacionVacante): boolean | null {
    return this.esGerenteGeneral ? v.aprobadoGerenteArea : v.aprobadoGerenteGeneral;
  }

  /** Etiqueta de la postura del otro nivel dentro de la fila de la vacante. */
  textoOtroNivel(v: AprobacionVacante): string {
    const otro = this.decisionOtroNivel(v);
    if (otro === null) return `${this.otroNivelLabel}: sin decidir`;
    return `${this.otroNivelLabel}: ${otro ? 'aprobada' : 'rechazada'}`;
  }

  decision(v: AprobacionVacante): boolean | undefined {
    return this.decisiones.get(v.requerimientoId);
  }

  marcar(v: AprobacionVacante, aprobado: boolean): void {
    if (this.soloLectura) return;
    this.decisiones.set(v.requerimientoId, aprobado);
  }

  marcarTodas(aprobado: boolean): void {
    if (this.soloLectura) return;
    for (const v of this.vacantes) this.decisiones.set(v.requerimientoId, aprobado);
  }

  get aprobadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === true).length;
  }

  get rechazadas(): number {
    return this.vacantes.filter((v) => this.decisiones.get(v.requerimientoId) === false).length;
  }

  /** Faltan vacantes por decidir: no se puede confirmar una decisión a medias. */
  get pendientes(): number {
    return this.vacantes.length - this.aprobadas - this.rechazadas;
  }

  get puedeConfirmar(): boolean {
    return !this.soloLectura && !this.enviando && this.vacantes.length > 0 && this.pendientes === 0;
  }

  /** Resumen que se muestra junto al botón de confirmar. */
  get resumenDecision(): string {
    if (this.pendientes > 0) {
      return this.pendientes === 1
        ? 'Falta decidir 1 vacante.'
        : `Faltan decidir ${this.pendientes} vacantes.`;
    }
    if (this.rechazadas === 0) return `Aprobarás las ${this.aprobadas} vacantes solicitadas.`;
    if (this.aprobadas === 0) return `Rechazarás las ${this.rechazadas} vacantes solicitadas.`;
    return `Aprobarás ${this.aprobadas} y rechazarás ${this.rechazadas}.`;
  }

  // ── Aviso "a quién le llega esta decisión" ──────────────────────────────
  // El correo a GTH solo sale cuando decide Gerencia General y queda al menos una vacante
  // aprobada (así lo hace el backend), así que el aviso se apaga en cuanto la decisión en curso
  // las rechaza todas: prometer un envío que no va a ocurrir es peor que no avisar nada. Al
  // gerente del área ni se le muestra — su visto bueno no dispara ningún correo.

  /** true cuando ya se sabe a quién le llegaría el correo (null = no aplica o no se pudo resolver). */
  get destinatariosCargados(): boolean {
    return !this.soloLectura && !!this.data?.destinatarios;
  }

  get destinatariosPara(): DestinatarioSolicitud[] {
    return this.data?.destinatarios?.para ?? [];
  }

  get destinatariosCopias(): DestinatarioSolicitud[] {
    return this.data?.destinatarios?.copias ?? [];
  }

  /** Se rechazaron todas las vacantes ya decididas: no habrá correo que enviar. */
  get sinEnvio(): boolean {
    return this.vacantes.length > 0 && this.pendientes === 0 && this.aprobadas === 0;
  }

  /** Tooltip del correo: el nombre de la persona cuando se conoce, más por qué lo recibe. */
  etiquetaDestinatario(d: DestinatarioSolicitud): string {
    return d.nombre ? `${d.nombre} — ${d.origen}` : d.origen;
  }

  /**
   * Lo que va después de cada correo de la lista: ", " entre los primeros, " y " antes del último
   * y el punto final al cerrar. Va acá y no en la plantilla porque los separadores escritos entre
   * etiquetas se pierden al compilar (el template quita los nodos de solo espacios).
   */
  separadorCorreo(i: number, total: number): string {
    if (i === total - 1) return '.';
    return i === total - 2 ? ' y ' : ', ';
  }

  // ── Confirmación ────────────────────────────────────────────────────────
  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;

    // El detalle cambia según quién firma: el GG mueve la solicitud, el gerente del área no.
    const detalle = this.esGerenteGeneral
      ? this.aprobadas === 0
        ? 'Ninguna vacante continuará y Gestión de Talento Humano no recibirá la solicitud.'
        : this.rechazadas === 0
          ? `Las ${this.aprobadas} vacantes pasarán a Gestión de Talento Humano para iniciar el reclutamiento.`
          : `${this.aprobadas} vacante(s) pasarán a Gestión de Talento Humano y ${this.rechazadas} no continuarán.`
      : 'Tu visto bueno quedará registrado. La solicitud avanza recién con la aprobación de Gerencia General.';

    const confirm = await Swal.fire({
      title: '¿Confirmas tu decisión?',
      html: `${detalle}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    });
    if (!confirm.isConfirmed) return;

    this.enviando = true;
    this.loaderService.show();
    this.service
      .decidir(this.aprobacionId, {
        decisiones: this.vacantes.map((v) => ({
          requerimientoId: v.requerimientoId,
          aprobado: this.decisiones.get(v.requerimientoId) === true,
        })),
        comentario: this.comentario.trim() ? this.comentario.trim() : null,
      })
      .subscribe({
        next: (res) => {
          this.enviando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({
            title: 'Decisión registrada',
            text: res.message,
            icon: 'success',
            confirmButtonColor: 'var(--color-abril-logo-blue)',
          });
          this.decided.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }
}
