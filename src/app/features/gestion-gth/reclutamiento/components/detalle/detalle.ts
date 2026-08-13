import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { TimePicker } from '../../../../../shared/components/time-picker/time-picker';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LongListCandidatoEnvio, ReclutamientoService } from '../../services/reclutamiento.service';
import { AsignacionGth, CandidatoAprobado, DetalleRequerimientoGth, Opcion } from '../../dtos/reclutamiento.dto';
import { CandidatoFormularioResumen } from '../../dtos/formulario-postulante.dto';
import { GthFormularioPostulanteModal } from '../formulario-postulante/formulario-postulante-modal';
import { estadoColors, faseAlcanzada } from '../../../shared/estado-colors';

/**
 * Candidato cargado para la long list (estado local del modal). El guardado (SharePoint +
 * persistencia en BD) aún no está implementado: al cerrar el modal la carga se pierde.
 */
interface CandidatoLongList {
  /** Archivo del CV subido. */
  cv: File;
  /** Nombre y apellido (prellenado desde el nombre del archivo; el usuario lo corrige). */
  nombre: string;
  /** Observaciones internas de GTH sobre el candidato. */
  comentario: string;
  /** Informe del candidato adjunto (opcional). */
  informe: File | null;
}

/** Datos editables de la cita de un candidato en la sección de programación de entrevistas. */
interface EntrevistaFormState {
  /** Fecha en formato `YYYY-MM-DD` (el que maneja `app-date-picker`). */
  fecha: string | null;
  /** Hora en formato `HH:mm` 24h (el que maneja `app-time-picker`). */
  hora: string | null;
  /** Id del lugar elegido del catálogo `lugaresEntrevista`. */
  lugarId: number | null;
}

/**
 * Datos editables de la evaluación de la entrevista de un candidato: los cuatro puntajes
 * (porcentajes 0-100) y los tres comentarios que arman el informe de finalista que ve el
 * área solicitante.
 */
interface EvaluacionFormState {
  puntajeEntrevista: number | null;
  puntajePsicotecnico: number | null;
  puntajeTecnica: number | null;
  puntajeResultado: number | null;
  comentarioEntrevista: string;
  comentarioPsicotecnico: string;
  comentarioRecomendacion: string;
}

/**
 * Modal de detalle del requerimiento (vista de GTH, se abre con el ojo de la bandeja):
 * cabecera con código/estado/puesto + sección "Asignación interna de GTH" (responsable,
 * tipo de proceso y SLA, prioridad interna y razón social activa con sus cupos) + secciones
 * según la fase del pipeline: canales de publicación (antes de publicar) → "Revisión de CV"
 * (publicado) → "Long list: CVs seleccionados" (carga de candidatos). Los desplegables de la
 * asignación guardan al cambiar (optimista); publicar e iniciar la revisión avanzan la fase.
 */
@Component({
  standalone: true,
  selector: 'app-gth-detalle-requerimiento',
  imports: [
    CommonModule,
    FormsModule,
    AbrilModalPanel,
    StatusBadge,
    SearchSelect,
    DatePicker,
    TimePicker,
    TitleCasePipe,
    GthFormularioPostulanteModal,
  ],
  templateUrl: './detalle.html',
})
export class GthDetalleRequerimiento implements OnInit {
  /** Id del requerimiento a mostrar. */
  @Input({ required: true }) requerimientoId!: number;
  /** Emite al cerrar; true si hubo cambios guardados (para refrescar la bandeja). */
  @Output() closeModal = new EventEmitter<boolean>();

  detalle: DetalleRequerimientoGth | null = null;

  /** Opciones del combo de tipo de proceso con el display "Junior · 20 días". */
  tiposProcesoOpts: Opcion[] = [];

  /** Selección actual de canales (ids marcados en los checkboxes). */
  canalesSeleccionados = new Set<number>();

  /**
   * Candidatos cargados para la long list (solo estado local por ahora: el guardado en
   * SharePoint/BD y el envío al solicitante se implementarán después).
   */
  candidatos: CandidatoLongList[] = [];

  // Secciones colapsables (abiertas por defecto, como en el diseño).
  seccionAsignacion = true;
  seccionPublicacion = true;
  seccionRevisionCv = true;
  seccionLongList = true;

  // La sección "Plantilla de comunicación" está comentada en el HTML: era una maqueta y su
  // envío es el mismo correo que ya manda "Enviar formulario". Su estado local
  // (`mostrarPlantilla`) se retira junto con ella para no dejar código muerto.

  /** true mientras se envía la long list (deshabilita el botón para evitar doble envío). */
  enviando = false;

  // ── Formulario de información del postulante (fase "Long list aprobada") ──
  /** Correo escrito por candidato para enviar el formulario (key = candidatoId). */
  correoFormulario: Record<number, string> = {};
  /** true mientras se envía el formulario de un candidato (key = candidatoId). */
  enviandoFormulario: Record<number, boolean> = {};
  /** Candidato cuyo modal "Ver formulario" está abierto (null = cerrado). */
  formularioCandidatoId: number | null = null;

  /** true mientras se avanza a la fase de entrevistas (evita doble clic). */
  continuando = false;

  // ── Programación de entrevistas (fase "Entrevistas") ─────────────────────
  /** Datos editables de la cita por candidato (key = candidatoId). */
  entrevistaForm: Record<number, EntrevistaFormState> = {};
  /** true mientras se envía/reenvía la invitación de un candidato (key = candidatoId). */
  enviandoEntrevista: Record<number, boolean> = {};
  /** Evaluación editable de la entrevista por candidato (key = candidatoId). */
  evaluacionForm: Record<number, EvaluacionFormState> = {};
  /** true mientras se guarda la evaluación de un candidato (key = candidatoId). */
  guardandoEvaluacion: Record<number, boolean> = {};
  /** true mientras se envía el correo de agradecimiento de un candidato (key = candidatoId). */
  enviandoAgradecimiento: Record<number, boolean> = {};

  private huboCambios = false;

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDetalle(this.requerimientoId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.tiposProcesoOpts = data.tiposProceso.map((t) => ({
          id: t.id,
          nombre: `${t.nombre} · ${t.slaDias} días`,
        }));
        this.canalesSeleccionados = new Set(
          data.canales.filter((c) => c.publicado).map((c) => c.id),
        );
        // En la fase "Long list aprobada" la asignación va colapsada (como en el diseño):
        // el foco pasa al envío del formulario del postulante.
        if (this.longListAprobada) {
          this.seccionAsignacion = false;
          // Prellena el correo de cada candidato con el último usado (si ya se envió).
          for (const c of data.candidatosAprobados) {
            if (c.formulario?.correoEnvio) this.correoFormulario[c.candidatoId] = c.formulario.correoEnvio;
          }
        }
        this.prepararFormulariosEntrevista();
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cerrar();
      },
    });
  }

  cerrar(): void {
    this.closeModal.emit(this.huboCambios);
  }

  estadoColors = estadoColors;

  // ── Fases del pipeline (controlan qué secciones se muestran) ────────────
  /** true si la vacante ya fue publicada (fase PUBLICACION o posterior). */
  get vacantePublicada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'PUBLICACION');
  }

  /** true si ya se inició la revisión de CV (fase LONG_LIST o posterior). */
  get enLongList(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST');
  }

  /** true si la long list ya fue enviada al solicitante (fase LONG_LIST_ENVIADA o posterior). */
  get longListEnviada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST_ENVIADA');
  }

  /** true si el solicitante ya aprobó la long list (fase LONG_LIST_APROBADA o posterior). */
  get longListAprobada(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'LONG_LIST_APROBADA');
  }

  /** true si el requerimiento ya pasó a la programación de entrevistas (fase ENTREVISTAS o posterior). */
  get enEntrevistas(): boolean {
    return !!this.detalle && faseAlcanzada(this.detalle.estadoCodigo, 'ENTREVISTAS');
  }

  /** Texto del recuadro "Siguiente paso" según la fase actual. */
  get siguientePasoTexto(): string {
    if (this.enEntrevistas)
      return (
        'Programar la entrevista de cada candidato con formulario aprobado y enviarle la ' +
        'invitación; luego registrar su resultado y enviarlo como finalista al área solicitante, ' +
        'o el correo de agradecimiento a quienes no continúan.'
      );
    if (this.longListAprobada)
      return `Continuar proceso con ${this.detalle?.area ? new TitleCasePipe().transform(this.detalle.area) : 'el área solicitante'}.`;
    if (this.longListEnviada)
      return 'Esperar revisión del solicitante para continuar con evaluación.';
    if (this.enLongList)
      return (
        'Subir los CVs seleccionados para la long list y registrar, para cada candidato, ' +
        'el comentario de GTH y su informe antes de enviar al solicitante.'
      );
    if (this.vacantePublicada) return 'Revisar CVs recibidos para preparar la long list.';
    return (
      'Asignar responsable, prioridad interna y tipo de proceso con su SLA; validar la ' +
      'razón social y publicar la vacante en los portales seleccionados.'
    );
  }

  // ── Asignación interna (autosave optimista por cambio) ──────────────────
  onAsignacionChange(campo: keyof AsignacionGth, valor: number | null): void {
    if (!this.detalle) return;
    const asignacion = this.detalle.asignacion;
    if (asignacion[campo] === valor) return;

    const prev = asignacion[campo];
    asignacion[campo] = valor;

    this.service.updateAsignacion(this.requerimientoId, asignacion).subscribe({
      next: () => (this.huboCambios = true),
      error: (err: HttpErrorResponse) => {
        asignacion[campo] = prev;
        this.errorService.handleError(err);
      },
    });
  }

  /** Tipo de proceso seleccionado (para el hint con su descripción, SLA y plazo estimado). */
  get tipoProcesoSeleccionado() {
    return this.detalle?.tiposProceso.find((t) => t.id === this.detalle?.asignacion.tipoProcesoId) ?? null;
  }

  /** Razón social seleccionada (para el hint de cupos y la advertencia). */
  get razonSocialSeleccionada() {
    return this.detalle?.razonesSociales.find((r) => r.id === this.detalle?.asignacion.contributorId) ?? null;
  }

  /** true si la razón social elegida no alcanza a cubrir las vacantes del requerimiento. */
  get sinCupos(): boolean {
    const razon = this.razonSocialSeleccionada;
    return !!this.detalle && !!razon && razon.cuposDisponibles < this.detalle.vacantes;
  }

  // ── Publicación en canales ──────────────────────────────────────────────
  toggleCanal(canalId: number): void {
    if (this.canalesSeleccionados.has(canalId)) this.canalesSeleccionados.delete(canalId);
    else this.canalesSeleccionados.add(canalId);
  }

  /** true si hay al menos un canal marcado (publicar avanza la fase, exige selección). */
  get puedePublicar(): boolean {
    return this.canalesSeleccionados.size > 0;
  }

  /**
   * Registra los canales seleccionados y avanza el requerimiento a la fase PUBLICACION.
   * No publica en los portales (sin APIs integradas): solo registra y continúa el flujo,
   * mostrando la sección "Revisión de CV".
   */
  publicar(): void {
    if (!this.detalle || !this.puedePublicar) return;

    this.loaderService.show();
    this.service.publicar(this.requerimientoId, [...this.canalesSeleccionados]).subscribe({
      next: (res) => {
        this.huboCambios = true;
        for (const c of this.detalle!.canales) c.publicado = this.canalesSeleccionados.has(c.id);
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Listo', text: res.message, confirmButtonColor: '#005D9D' });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Revisión de CV / Long list ──────────────────────────────────────────
  /** Avanza el requerimiento a la fase LONG_LIST y muestra la sección de carga de candidatos. */
  iniciarRevisionCv(): void {
    if (!this.detalle) return;

    this.loaderService.show();
    this.service.iniciarRevisionCv(this.requerimientoId).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Agrega un candidato por cada CV elegido, con el nombre prellenado desde el archivo. */
  onCvsSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      this.candidatos.push({
        cv: file,
        nombre: this.derivarNombre(file.name),
        comentario: '',
        informe: null,
      });
    }
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  quitarCandidato(index: number): void {
    this.candidatos.splice(index, 1);
  }

  onInformeSeleccionado(candidato: CandidatoLongList, event: Event): void {
    const input = event.target as HTMLInputElement;
    candidato.informe = input.files?.[0] ?? null;
    input.value = '';
  }

  quitarInforme(candidato: CandidatoLongList): void {
    candidato.informe = null;
  }

  /** true si se puede enviar la long list (hay al menos un candidato y no se está enviando). */
  get puedeEnviarLongList(): boolean {
    return this.candidatos.length > 0 && !this.enviando;
  }

  /**
   * Envía la long list al solicitante: sube los CVs/informes, dispara el correo configurado
   * y avanza el requerimiento a LONG_LIST_ENVIADA. Al terminar, el modal pasa al estado
   * "Long list enviada" (se oculta la carga de candidatos y cambia el "Siguiente paso").
   */
  enviarLongList(): void {
    if (!this.detalle || !this.puedeEnviarLongList) return;

    // Cada candidato debe tener nombre; el CV ya es obligatorio por construcción.
    const sinNombre = this.candidatos.some((c) => !c.nombre.trim());
    if (sinNombre) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el nombre de un candidato',
        text: 'Registra el nombre y apellido de cada candidato antes de enviar la long list.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // El puesto no viaja: el backend lo toma del requerimiento (es el que pidió el solicitante).
    const candidatos: LongListCandidatoEnvio[] = this.candidatos.map((c) => ({
      nombre: c.nombre.trim(),
      comentario: c.comentario.trim(),
      cv: c.cv,
      informe: c.informe,
    }));

    this.enviando = true;
    this.loaderService.show();
    this.service.enviarLongList(this.requerimientoId, candidatos).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.candidatos = [];
        this.enviando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Long list enviada',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Formulario de información del postulante ────────────────────────────
  /** Etiqueta del botón "Ver formulario" según el estado del formulario del candidato. */
  botonFormularioLabel(c: CandidatoAprobado): string {
    switch (c.formulario?.estadoCodigo) {
      case 'APROBADO':  return 'Ver formulario aprobado';
      case 'RECHAZADO': return 'Ver formulario rechazado';
      default:          return 'Ver formulario';
    }
  }

  /** Badge de estado del formulario del candidato (texto + colores). */
  estadoFormularioBadge(c: CandidatoAprobado): { text: string; bg: string; color: string } {
    switch (c.formulario?.estadoCodigo) {
      case 'ENVIADO':    return { text: 'Enviado',            bg: '#E0F2FE', color: '#0284C7' };
      case 'COMPLETADO': return { text: 'Por revisar',        bg: '#FEF3C7', color: '#B45309' };
      case 'APROBADO':   return { text: 'Aprobado',           bg: '#DCFCE7', color: '#15803D' };
      case 'RECHAZADO':  return { text: 'Rechazado',          bg: '#FEE2E2', color: '#B91C1C' };
      default:           return { text: 'Pendiente de envío', bg: '#F3F4F6', color: '#6B7280' };
    }
  }

  /** El formulario ya aprobado no se puede reenviar. */
  formularioBloqueado(c: CandidatoAprobado): boolean {
    return c.formulario?.estadoCodigo === 'APROBADO';
  }

  /** Envía (o reenvía) el formulario al correo escrito para el candidato. */
  enviarFormulario(c: CandidatoAprobado): void {
    const correo = (this.correoFormulario[c.candidatoId] ?? '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo no válido',
        text: 'Ingresa un correo electrónico válido para enviar el formulario al postulante.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.enviandoFormulario[c.candidatoId] = true;
    this.service.enviarFormulario(c.candidatoId, correo).subscribe({
      next: (res) => {
        c.formulario = res.formulario;
        this.enviandoFormulario[c.candidatoId] = false;
        this.huboCambios = true;
        Swal.fire({ icon: 'success', title: 'Formulario enviado', text: res.message, confirmButtonColor: '#005D9D' });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoFormulario[c.candidatoId] = false;
        this.errorService.handleError(err);
      },
    });
  }

  /** Abre el modal "Ver formulario" del candidato. */
  abrirFormulario(c: CandidatoAprobado): void {
    this.formularioCandidatoId = c.candidatoId;
  }

  cerrarFormulario(): void {
    this.formularioCandidatoId = null;
  }

  /** Al aprobar/rechazar desde el modal, refresca el estado del formulario del candidato. */
  onFormularioCambios(resumen: CandidatoFormularioResumen): void {
    const c = this.detalle?.candidatosAprobados.find((x) => x.candidatoId === this.formularioCandidatoId);
    if (c) c.formulario = resumen;
    this.huboCambios = true;
  }

  // ── Control informativo del Multitest ───────────────────────────────────
  /**
   * Marca/desmarca el Multitest de un candidato (optimista: pinta el check al instante y lo
   * revierte si el guardado falla). El check es informativo —la prueba se rinde fuera de la
   * plataforma— pero sí es requisito para habilitar el paso a entrevistas.
   */
  toggleMultitest(c: CandidatoAprobado, realizado: boolean): void {
    const previo = c.multitestRealizado;
    c.multitestRealizado = realizado;

    this.service.setMultitest(c.candidatoId, realizado).subscribe({
      next: () => {
        this.huboCambios = true;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        c.multitestRealizado = previo;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /** true si todos los candidatos aprobados tienen el Multitest marcado. */
  get multitestCompleto(): boolean {
    const candidatos = this.detalle?.candidatosAprobados ?? [];
    return candidatos.length > 0 && candidatos.every((c) => c.multitestRealizado);
  }

  /** true si ningún candidato quedó con el formulario pendiente (todos aprobados o rechazados). */
  get formulariosDecididos(): boolean {
    const candidatos = this.detalle?.candidatosAprobados ?? [];
    return (
      candidatos.length > 0 &&
      candidatos.every(
        (c) => c.formulario?.estadoCodigo === 'APROBADO' || c.formulario?.estadoCodigo === 'RECHAZADO',
      )
    );
  }

  /** true si al menos un formulario del postulante quedó aprobado (habría a quién entrevistar). */
  get hayFormularioAprobado(): boolean {
    return (this.detalle?.candidatosAprobados ?? []).some(
      (c) => c.formulario?.estadoCodigo === 'APROBADO',
    );
  }

  /**
   * Requisitos para pasar a entrevistas: Multitest marcado en todos los candidatos, todos los
   * formularios ya revisados (aprobados o rechazados, ninguno pendiente de completar) y al menos
   * uno aprobado. El backend revalida lo mismo.
   */
  get puedeContinuarAEntrevistas(): boolean {
    return (
      this.multitestCompleto && this.formulariosDecididos && this.hayFormularioAprobado && !this.continuando
    );
  }

  /** Qué falta para habilitar el paso a entrevistas (hint bajo el botón). Vacío si ya se puede. */
  get requisitosContinuarTexto(): string {
    if (this.puedeContinuarAEntrevistas) return '';
    if (!this.formulariosDecididos)
      return 'Revisa el formulario de todos los candidatos (aprobar o rechazar) para continuar.';
    if (!this.hayFormularioAprobado)
      return 'Ningún formulario quedó aprobado: no hay candidatos a quienes entrevistar.';
    if (!this.multitestCompleto)
      return 'Marca el Multitest de todos los candidatos para continuar.';
    return '';
  }

  /** Avanza el requerimiento a la fase ENTREVISTAS y muestra la sección de programación. */
  continuarAEntrevistas(): void {
    if (!this.detalle || !this.puedeContinuarAEntrevistas) return;

    this.continuando = true;
    this.loaderService.show();
    this.service.continuarAEntrevistas(this.requerimientoId).subscribe({
      next: (res) => {
        this.huboCambios = true;
        this.detalle!.estadoCodigo = res.estadoCodigo;
        this.detalle!.estadoNombre = res.estadoNombre;
        this.prepararFormulariosEntrevista();
        this.continuando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.continuando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Programación de entrevistas ─────────────────────────────────────────
  /** Candidatos a entrevistar: los que tienen el formulario del postulante aprobado. */
  get candidatosParaEntrevista(): CandidatoAprobado[] {
    return (this.detalle?.candidatosAprobados ?? []).filter(
      (c) => c.formulario?.estadoCodigo === 'APROBADO',
    );
  }

  /** Fecha de hoy en `YYYY-MM-DD`: no se cita a un candidato en una fecha pasada. */
  get hoyIso(): string {
    const hoy = new Date();
    const mes = `${hoy.getMonth() + 1}`.padStart(2, '0');
    const dia = `${hoy.getDate()}`.padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  /** true si la cita del candidato está completa y no se está enviando ya. */
  puedeEnviarEntrevista(c: CandidatoAprobado): boolean {
    const form = this.entrevistaForm[c.candidatoId];
    return !!form?.fecha && !!form?.hora && !!form?.lugarId && !this.enviandoEntrevista[c.candidatoId];
  }

  /** Etiqueta del botón según si la entrevista ya se había programado (reprogramación). */
  botonEntrevistaLabel(c: CandidatoAprobado): string {
    if (this.enviandoEntrevista[c.candidatoId]) return 'Enviando…';
    return c.entrevista ? 'Reprogramar y reenviar' : 'Enviar invitación';
  }

  /** Programa (o reprograma) la entrevista del candidato y le envía la invitación por correo. */
  guardarEntrevista(c: CandidatoAprobado): void {
    const form = this.entrevistaForm[c.candidatoId];
    if (!form?.fecha || !form?.hora || !form?.lugarId) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos de la entrevista',
        text: 'Registra la fecha, la hora y el lugar antes de enviar la invitación.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.enviandoEntrevista[c.candidatoId] = true;
    this.service.guardarEntrevista(c.candidatoId, form.fecha, form.hora, form.lugarId).subscribe({
      next: (res) => {
        c.entrevista = res.entrevista;
        this.enviandoEntrevista[c.candidatoId] = false;
        this.huboCambios = true;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Entrevista programada',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoEntrevista[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Evaluación de la entrevista (puntajes + informe de finalista) ────────
  /** true si el candidato ya no continúa: se le envió el correo de agradecimiento. */
  noContinua(c: CandidatoAprobado): boolean {
    return c.evaluacion?.resultadoCodigo === 'NO_PASO';
  }

  /**
   * true si se puede registrar la evaluación del candidato: ya se le envió la invitación a la
   * entrevista y sigue en carrera (al enviar el agradecimiento su informe queda cerrado).
   */
  puedeEvaluar(c: CandidatoAprobado): boolean {
    return !!c.entrevista?.enviadoEn && !this.noContinua(c);
  }

  /**
   * Guarda los cuatro puntajes y los tres comentarios del candidato y, con eso, lo envía como
   * finalista: el informe queda disponible en la vista del área solicitante.
   */
  guardarEvaluacion(c: CandidatoAprobado): void {
    const form = this.evaluacionForm[c.candidatoId];
    if (!form || this.guardandoEvaluacion[c.candidatoId]) return;

    const fueraDeRango = [
      form.puntajeEntrevista,
      form.puntajePsicotecnico,
      form.puntajeTecnica,
      form.puntajeResultado,
    ].some((p) => p !== null && (p < 0 || p > 100));
    if (fueraDeRango) {
      Swal.fire({
        icon: 'warning',
        title: 'Puntaje no válido',
        text: 'Los puntajes se registran como porcentaje: deben estar entre 0 y 100.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    this.guardandoEvaluacion[c.candidatoId] = true;
    this.service
      .guardarEvaluacion(c.candidatoId, {
        puntajeEntrevista: form.puntajeEntrevista,
        puntajePsicotecnico: form.puntajePsicotecnico,
        puntajeTecnica: form.puntajeTecnica,
        puntajeResultado: form.puntajeResultado,
        comentarioEntrevista: form.comentarioEntrevista.trim() || null,
        comentarioPsicotecnico: form.comentarioPsicotecnico.trim() || null,
        comentarioRecomendacion: form.comentarioRecomendacion.trim() || null,
      })
      .subscribe({
        next: (res) => {
          c.evaluacion = res.evaluacion;
          this.guardandoEvaluacion[c.candidatoId] = false;
          this.huboCambios = true;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Finalista enviado',
            text: 'El informe del candidato ya está disponible para el área solicitante.',
            confirmButtonColor: '#005D9D',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoEvaluacion[c.candidatoId] = false;
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }

  /**
   * Envía al candidato el correo de agradecimiento por no continuar en el proceso: deja su
   * resultado en "No pasó" y lo saca del informe de finalistas del solicitante.
   */
  async enviarAgradecimiento(c: CandidatoAprobado): Promise<void> {
    if (this.enviandoAgradecimiento[c.candidatoId]) return;

    const yaEnviado = !!c.evaluacion?.agradecimientoEnviadoEn;
    const confirm = await Swal.fire({
      icon: 'question',
      title: yaEnviado ? '¿Reenviar el correo de agradecimiento?' : '¿Enviar el correo de agradecimiento?',
      html:
        `Se le enviará a <b>${c.correoContacto ?? 'su correo registrado'}</b> el correo de ` +
        'agradecimiento por participar. El candidato quedará registrado como <b>No continúa</b> ' +
        'y dejará de aparecer entre los finalistas del área solicitante.',
      showCancelButton: true,
      confirmButtonText: yaEnviado ? 'Sí, reenviar' : 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
    });
    if (!confirm.isConfirmed) return;

    this.enviandoAgradecimiento[c.candidatoId] = true;
    this.service.enviarAgradecimiento(c.candidatoId).subscribe({
      next: (res) => {
        c.evaluacion = res.evaluacion;
        this.enviandoAgradecimiento[c.candidatoId] = false;
        this.huboCambios = true;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoAgradecimiento[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Prellena, por candidato, la cita (con lo ya programado o el primer lugar del catálogo —la
   * oficina principal— por defecto) y la evaluación de su entrevista.
   */
  private prepararFormulariosEntrevista(): void {
    if (!this.detalle) return;
    const lugarPorDefecto = this.detalle.lugaresEntrevista[0]?.id ?? null;

    for (const c of this.detalle.candidatosAprobados) {
      this.entrevistaForm[c.candidatoId] = {
        fecha: c.entrevista?.fecha ?? null,
        hora: c.entrevista?.hora ?? null,
        lugarId: c.entrevista?.lugarId ?? lugarPorDefecto,
      };
      this.evaluacionForm[c.candidatoId] = {
        puntajeEntrevista: c.evaluacion?.puntajeEntrevista ?? null,
        puntajePsicotecnico: c.evaluacion?.puntajePsicotecnico ?? null,
        puntajeTecnica: c.evaluacion?.puntajeTecnica ?? null,
        puntajeResultado: c.evaluacion?.puntajeResultado ?? null,
        comentarioEntrevista: c.evaluacion?.comentarioEntrevista ?? '',
        comentarioPsicotecnico: c.evaluacion?.comentarioPsicotecnico ?? '',
        comentarioRecomendacion: c.evaluacion?.comentarioRecomendacion ?? '',
      };
    }
  }

  /**
   * Nombre tentativo del candidato a partir del nombre del archivo del CV (quita extensión,
   * separadores y palabras típicas como "CV"). Es solo un prellenado: el usuario lo corrige.
   */
  private derivarNombre(fileName: string): string {
    return fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\b(cv|curriculum|curr[ií]culum|vitae)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
