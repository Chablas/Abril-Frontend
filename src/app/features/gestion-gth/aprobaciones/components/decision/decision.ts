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

  // ── Nivel del usuario y las casillas ────────────────────────────────────
  get esGerenteGeneral(): boolean {
    return this.data?.nivel === 'GERENTE_GENERAL';
  }

  get esGth(): boolean {
    return this.data?.nivel === 'GTH';
  }

  /** Casilla que el usuario puede marcar. */
  get miCasilla(): AprobacionNivelResumen | null {
    if (!this.data) return null;
    if (this.esGerenteGeneral) return this.data.gerenteGeneral;
    if (this.esGth) return this.data.gth;
    return this.data.gerenteArea;
  }

  /** Nombre de la firma del usuario, para rotular su casilla. */
  get miNivelLabel(): string {
    if (this.esGerenteGeneral) return 'Gerencia General';
    if (this.esGth) return 'GTH';
    return 'Gerente del área';
  }

  /**
   * Las OTRAS firmas que esta solicitud necesita: solo se muestran, nunca se editan. Son las que
   * la solicitud requiere menos la propia — en un reemplazo, quien decide ve la casilla del otro
   * firmante y sabe si la vacante ya puede avanzar o sigue esperando.
   */
  get otrasCasillas(): { etiqueta: string; resumen: AprobacionNivelResumen }[] {
    const d = this.data;
    if (!d) return [];
    const out: { etiqueta: string; resumen: AprobacionNivelResumen }[] = [];
    if (d.requiereGerenteGeneral && !this.esGerenteGeneral)
      out.push({ etiqueta: 'Gerencia General', resumen: d.gerenteGeneral });
    if (d.requiereGerenteArea && d.nivel !== 'GERENTE_AREA')
      out.push({ etiqueta: 'Gerente del área', resumen: d.gerenteArea });
    if (d.requiereGth && !this.esGth)
      out.push({ etiqueta: 'GTH', resumen: d.gth });
    return out;
  }

  get titulo(): string {
    if (this.soloLectura) return 'Decisión registrada';
    return 'Aprobación de solicitud de personal';
  }

  // ── Decisión por vacante ────────────────────────────────────────────────
  /**
   * Solo las vacantes que le toca decidir a este usuario. Una solicitud mixta se decide en dos
   * actos —el Gerente General firma las nuevas, el gerente del área y GTH los reemplazos—, así que
   * mostrarle las ajenas solo le daría botones que el backend va a rechazar.
   */
  get vacantes(): AprobacionVacante[] {
    const todas = this.data?.vacantes ?? [];
    const nivel = this.data?.nivel;
    if (!nivel || nivel === 'NINGUNO') return todas;
    return todas.filter((v) =>
      v.ruta === 'GG' ? nivel === 'GERENTE_GENERAL' : nivel === 'GERENTE_AREA' || nivel === 'GTH',
    );
  }

  /** Vacantes de la solicitud que decide otra gente: se listan aparte, solo para dar contexto. */
  get vacantesDeOtros(): AprobacionVacante[] {
    const mias = new Set(this.vacantes.map((v) => v.requerimientoId));
    return (this.data?.vacantes ?? []).filter((v) => !mias.has(v.requerimientoId));
  }

  get soloLectura(): boolean {
    return !this.data?.puedeDecidir;
  }

  /** Lo que MI nivel dejó registrado en esta vacante (null si aún no decidió). */
  decisionRegistrada(v: AprobacionVacante): boolean | null {
    if (this.esGerenteGeneral) return v.aprobadoGerenteGeneral;
    if (this.esGth) return v.aprobadoGth;
    return v.aprobadoGerenteArea;
  }

  /**
   * Lo que la OTRA firma dejó registrado en esta vacante (null si no aplica o no opinó). Solo los
   * reemplazos tienen dos firmas; en la ruta de Gerencia General no hay «otra».
   */
  decisionOtroNivel(v: AprobacionVacante): boolean | null {
    if (v.ruta !== 'AREA_GTH') return null;
    return this.data?.nivel === 'GERENTE_AREA' ? v.aprobadoGth : v.aprobadoGerenteArea;
  }

  /**
   * La postura de la OTRA firma de la vacante, cuando la hay. Solo tiene sentido en los reemplazos
   * (los únicos con dos firmas): dice si la vacante ya está lista para avanzar o sigue esperando.
   * Cadena vacía cuando la otra parte todavía no opinó — repetir «sin decidir» en cada fila no
   * aporta nada, la casilla de arriba ya lo dice una vez.
   */
  textoOtroNivel(v: AprobacionVacante): string {
    const otro = this.decisionOtroNivel(v);
    if (otro === null) return '';
    const quien = this.data?.nivel === 'GERENTE_AREA' ? 'GTH' : 'Gerente del área';
    return `${quien}: ${otro ? 'aprobada' : 'rechazada'}`;
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
  // La decisión de Gerencia General dispara dos correos —el aviso a GTH y el de vacantes
  // aprobadas a TI—, y los dos solo salen si queda al menos una vacante aprobada (así lo hace el
  // backend), así que el aviso se apaga en cuanto la decisión en curso las rechaza todas:
  // prometer un envío que no va a ocurrir es peor que no avisar nada. Los destinatarios llegan
  // ya fusionados en una sola lista: lo que importa es a quién le llega la decisión, no cuántos
  // correos salen. Al gerente del área ni se le muestra — su visto bueno no dispara ninguno.

  /** true cuando ya se sabe a quién le llegarían los correos (null = no aplica o no se pudo resolver). */
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

    // El detalle cambia según quién firma: la del Gerente General mueve sus vacantes sola, la de
    // un reemplazo necesita además la del otro firmante (gerente del área ↔ GTH).
    const detalle = this.esGerenteGeneral
      ? this.aprobadas === 0
        ? 'Ninguna vacante continuará y Gestión de Talento Humano no recibirá la solicitud.'
        : this.rechazadas === 0
          ? `Las ${this.aprobadas} vacantes pasarán a Gestión de Talento Humano para iniciar el reclutamiento.`
          : `${this.aprobadas} vacante(s) pasarán a Gestión de Talento Humano y ${this.rechazadas} no continuarán.`
      : this.aprobadas === 0
        ? 'Ninguna vacante continuará: un rechazo la cierra sin esperar la otra firma.'
        : `Tu decisión quedará registrada. Cada vacante aprobada pasa a Gestión de Talento Humano en cuanto tenga también la firma de ${this.esGth ? 'el gerente del área' : 'GTH'}.`;

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
