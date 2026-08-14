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
import {
  FormularioEnvioMasivoItem,
  LongListCandidatoEnvio,
  ReclutamientoService,
} from '../../services/reclutamiento.service';
import {
  DecisionFormularioAplicada,
  FormularioDecisionService,
} from '../../services/formulario-decision.service';
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

/**
 * Correo válido para enviarle el formulario al postulante. Misma expresión que valida el backend
 * (`PostulanteFormularioService.EmailRegex`): la usan tanto el envío individual como el masivo.
 */
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
 * Datos editables de la evaluación de la entrevista de un candidato: los tres comentarios que
 * arman el informe de finalista que ve el área solicitante.
 */
interface EvaluacionFormState {
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
  /** true mientras se aprueba/rechaza el formulario de un candidato (key = candidatoId). */
  decidiendoFormulario: Record<number, boolean> = {};
  /** Candidatos marcados para el envío masivo del formulario (ids). */
  seleccionFormulario = new Set<number>();
  /** true mientras corre el envío masivo (deshabilita el botón para evitar doble envío). */
  enviandoMasivo = false;
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
    private decisiones: FormularioDecisionService,
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

  /** Envía (o reenvía) el formulario al correo escrito para el candidato. */
  async enviarFormulario(c: CandidatoAprobado): Promise<void> {
    const correo = (this.correoFormulario[c.candidatoId] ?? '').trim();
    if (!CORREO_VALIDO.test(correo)) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo no válido',
        text: 'Ingresa un correo electrónico válido para enviar el formulario al postulante.',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // Reenviar uno ya aprobado lo reabre: es útil si el postulante se equivocó en un dato, pero
    // deshace la aprobación, así que se confirma antes.
    if (c.formulario?.estadoCodigo === 'APROBADO') {
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Este formulario ya fue aprobado',
        html:
          '¿Seguro que quieres volver a enviárselo? Se le reabre con la información que ya declaró ' +
          'para que la corrija, y su formulario vuelve a quedar <b>Enviado</b> —deja de contar como ' +
          'aprobado— hasta que lo complete y lo apruebes de nuevo.',
        showCancelButton: true,
        confirmButtonText: 'Reenviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#B91C1C',
      });
      if (!confirm.isConfirmed) return;
    }

    this.enviandoFormulario[c.candidatoId] = true;
    this.service.enviarFormulario(c.candidatoId, correo).subscribe({
      next: (res) => {
        c.formulario = res.formulario;
        this.enviandoFormulario[c.candidatoId] = false;
        this.huboCambios = true;
        // App zoneless: sin esto el badge del candidato se queda con el estado anterior.
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          // Reenviar un formulario rechazado repite el correo de observaciones, no la invitación.
          title: res.formulario.estadoCodigo === 'RECHAZADO' ? 'Observaciones reenviadas' : 'Formulario enviado',
          text: res.message,
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoFormulario[c.candidatoId] = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Envío masivo del formulario (selección de candidatos) ────────────────
  /** Marca/desmarca un candidato para el envío masivo. */
  toggleSeleccionFormulario(candidatoId: number): void {
    if (this.seleccionFormulario.has(candidatoId)) this.seleccionFormulario.delete(candidatoId);
    else this.seleccionFormulario.add(candidatoId);
  }

  /** Candidatos marcados, en el mismo orden en que se listan en la pantalla. */
  get candidatosSeleccionados(): CandidatoAprobado[] {
    return (this.detalle?.candidatosAprobados ?? []).filter((c) =>
      this.seleccionFormulario.has(c.candidatoId),
    );
  }

  get seleccionadosCount(): number {
    return this.candidatosSeleccionados.length;
  }

  /** true si están marcados todos los candidatos (estado del check maestro). */
  get todosSeleccionados(): boolean {
    const candidatos = this.detalle?.candidatosAprobados ?? [];
    return candidatos.length > 0 && this.seleccionadosCount === candidatos.length;
  }

  /** true si hay algunos marcados pero no todos (estado indeterminado del check maestro). */
  get seleccionParcial(): boolean {
    const marcados = this.seleccionadosCount;
    return marcados > 0 && marcados < (this.detalle?.candidatosAprobados ?? []).length;
  }

  /** Marca o desmarca a todos los candidatos de una vez. */
  toggleSeleccionTodos(marcar: boolean): void {
    if (!marcar) {
      this.seleccionFormulario.clear();
      return;
    }
    this.seleccionFormulario = new Set(
      (this.detalle?.candidatosAprobados ?? []).map((c) => c.candidatoId),
    );
  }

  get puedeEnviarSeleccionados(): boolean {
    return this.seleccionadosCount > 0 && !this.enviandoMasivo;
  }

  /**
   * Envía el formulario a todos los candidatos marcados en una sola petición, con las mismas reglas
   * del envío individual (correo válido y confirmación si alguno ya estaba aprobado). El backend
   * responde el detalle por candidato: los que salieron se desmarcan y los que fallaron quedan
   * marcados para reintentarlos sin volver a seleccionarlos.
   */
  async enviarFormulariosSeleccionados(): Promise<void> {
    const seleccionados = this.candidatosSeleccionados;
    if (seleccionados.length === 0 || this.enviandoMasivo) return;

    const nombre = (c: CandidatoAprobado) => new TitleCasePipe().transform(c.nombre);

    // Se exige el correo de todos antes de mandar el lote: es preferible que GTH corrija en la misma
    // pantalla a que el envío salga a medias y haya que rastrear a quién le llegó.
    const sinCorreo = seleccionados.filter(
      (c) => !CORREO_VALIDO.test((this.correoFormulario[c.candidatoId] ?? '').trim()),
    );
    if (sinCorreo.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan correos válidos',
        html:
          'Registra un correo electrónico válido para continuar:<br><b>' +
          sinCorreo.map(nombre).join('</b><br><b>') +
          '</b>',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    // Reenviar un formulario ya aprobado lo reabre y deshace su aprobación: misma advertencia que en
    // el envío individual, acá con la lista de a quiénes les pasaría.
    const yaAprobados = seleccionados.filter((c) => c.formulario?.estadoCodigo === 'APROBADO');
    const confirm = await Swal.fire({
      icon: yaAprobados.length > 0 ? 'warning' : 'question',
      title: `¿Enviar el formulario a ${seleccionados.length} postulante(s)?`,
      html:
        `Se le enviará el enlace del formulario a los ${seleccionados.length} candidato(s) ` +
        'seleccionado(s), cada uno al correo registrado en su ficha.' +
        (yaAprobados.length > 0
          ? '<br><br>Ojo: <b>' +
            yaAprobados.map(nombre).join('</b>, <b>') +
            '</b> ya tenía(n) el formulario <b>aprobado</b>. Se le(s) reabre con la información que ' +
            'ya declaró y vuelve a quedar <b>Enviado</b> —deja de contar como aprobado— hasta que lo ' +
            'complete y lo apruebes de nuevo.'
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Enviar a todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: yaAprobados.length > 0 ? '#B91C1C' : '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    const candidatos: FormularioEnvioMasivoItem[] = seleccionados.map((c) => ({
      candidatoId: c.candidatoId,
      correo: (this.correoFormulario[c.candidatoId] ?? '').trim(),
    }));

    this.enviandoMasivo = true;
    this.loaderService.show();
    this.service.enviarFormularioMasivo(candidatos).subscribe({
      next: (res) => {
        const porCandidato = new Map(seleccionados.map((c) => [c.candidatoId, c]));
        const fallidos: string[] = [];

        for (const r of res.resultados) {
          const c = porCandidato.get(r.candidatoId);
          // El resumen llega incluso cuando el correo falló (el formulario ya quedó registrado):
          // la ficha tiene que reflejar el estado real de la base de datos.
          if (c && r.formulario) c.formulario = r.formulario;
          if (r.enviado) this.seleccionFormulario.delete(r.candidatoId);
          else if (c) fallidos.push(`${nombre(c)}: ${r.error ?? 'No se pudo enviar.'}`);
        }

        this.huboCambios = true;
        this.enviandoMasivo = false;
        this.loaderService.hide();
        // App zoneless: sin esto los badges de los candidatos se quedan con el estado anterior.
        this.cdr.detectChanges();

        Swal.fire({
          icon: res.fallidos === 0 ? 'success' : res.enviados === 0 ? 'error' : 'warning',
          title: res.fallidos === 0 ? 'Formularios enviados' : 'Envío incompleto',
          html:
            res.message +
            (fallidos.length > 0
              ? '<br><br>No se pudo enviar a:<br>' + fallidos.join('<br>')
              : ''),
          confirmButtonColor: '#005D9D',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoMasivo = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  /** true si el postulante ya completó el formulario y falta que GTH lo apruebe o rechace. */
  formularioPorRevisar(c: CandidatoAprobado): boolean {
    return c.formulario?.estadoCodigo === 'COMPLETADO';
  }

  /**
   * true si el formulario se puede rechazar. Además del completado entra el que se envió y el
   * postulante nunca llenó: rechazarlo es lo que destraba el paso a la programación de entrevistas
   * cuando alguien no responde. El enlace no se toca — si lo completa después vuelve a aparecer
   * como «Por revisar».
   */
  formularioRechazable(c: CandidatoAprobado): boolean {
    const estado = c.formulario?.estadoCodigo;
    return estado === 'COMPLETADO' || estado === 'ENVIADO';
  }

  /**
   * Aprueba/rechaza el formulario desde la ficha del candidato, sin abrir el modal de revisión.
   * Son los mismos botones del modal (mismo flujo y mismas observaciones): acá están a la mano
   * para el caso en que GTH ya revisó los datos y solo quiere decidir.
   */
  aprobarFormulario(c: CandidatoAprobado): Promise<void> {
    return this.decidirFormulario(c, () => this.decisiones.aprobar(c.candidatoId));
  }

  rechazarFormulario(c: CandidatoAprobado): Promise<void> {
    return this.decidirFormulario(c, () =>
      this.decisiones.rechazar(c.candidatoId, this.formularioPorRevisar(c)),
    );
  }

  private async decidirFormulario(
    c: CandidatoAprobado,
    accion: () => Promise<DecisionFormularioAplicada | null>,
  ): Promise<void> {
    if (this.decidiendoFormulario[c.candidatoId]) return;
    this.decidiendoFormulario[c.candidatoId] = true;
    const res = await accion();
    this.decidiendoFormulario[c.candidatoId] = false;
    if (res) {
      c.formulario = res.resumen;
      this.huboCambios = true;
    }
    // App zoneless: el cambio ocurre después de un await, así que hay que pintar a mano.
    this.cdr.detectChanges();
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
      return 'Revisa el formulario de todos los candidatos para continuar: apruébalo, o recházalo si el postulante nunca lo completó.';
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

  // ── Evaluación de la entrevista (informe de finalista) ───────────────────
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
   * Guarda los tres comentarios del candidato y, con eso, lo envía como finalista: el informe
   * queda disponible en la vista del área solicitante.
   */
  guardarEvaluacion(c: CandidatoAprobado): void {
    const form = this.evaluacionForm[c.candidatoId];
    if (!form || this.guardandoEvaluacion[c.candidatoId]) return;

    this.guardandoEvaluacion[c.candidatoId] = true;
    this.service
      .guardarEvaluacion(c.candidatoId, {
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
