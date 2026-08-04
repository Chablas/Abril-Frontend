import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LongListCandidatoEnvio, ReclutamientoService } from '../../services/reclutamiento.service';
import { AsignacionGth, CandidatoAprobado, DetalleRequerimientoGth, Opcion } from '../../dtos/reclutamiento.dto';
import { CandidatoFormularioResumen } from '../../dtos/formulario-postulante.dto';
import { GthFormularioPostulanteModal } from '../formulario-postulante/formulario-postulante-modal';
import { estadoColors, faseAlcanzada } from '../../estado-colors';

/**
 * Candidato cargado para la long list (estado local del modal). El guardado (SharePoint +
 * persistencia en BD) aún no está implementado: al cerrar el modal la carga se pierde.
 */
interface CandidatoLongList {
  /** Archivo del CV subido. */
  cv: File;
  /** Nombre y apellido (prellenado desde el nombre del archivo; el usuario lo corrige). */
  nombre: string;
  /**
   * Puesto detectado en el CV. Hoy se escribe a mano; a futuro lo prellenará una IA a partir
   * del CV (con corrección manual como respaldo).
   */
  puesto: string;
  /** Tiempo de experiencia en años (a futuro lo prellenará la IA). Null si no se indicó. */
  experienciaAnios: number | null;
  /** Disponibilidad del candidato ("15 días", "Inmediata"…; a futuro la prellenará la IA). */
  disponibilidad: string;
  /** Canal de publicación usado como fuente de reclutamiento. */
  fuenteCanalId: number | null;
  /** Observaciones internas de GTH sobre el candidato. */
  comentario: string;
  /** Informe del candidato adjunto (opcional). */
  informe: File | null;
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

  /** Muestra/oculta la vista previa de la plantilla de comunicación (fase "Long list aprobada"). */
  mostrarPlantilla = true;

  /** true mientras se envía la long list (deshabilita el botón para evitar doble envío). */
  enviando = false;

  // ── Formulario de información del postulante (fase "Long list aprobada") ──
  /** Correo escrito por candidato para enviar el formulario (key = candidatoId). */
  correoFormulario: Record<number, string> = {};
  /** true mientras se envía el formulario de un candidato (key = candidatoId). */
  enviandoFormulario: Record<number, boolean> = {};
  /** Candidato cuyo modal "Ver formulario" está abierto (null = cerrado). */
  formularioCandidatoId: number | null = null;

  private huboCambios = false;

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
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
        this.loaderService.hide();
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

  /** Texto del recuadro "Siguiente paso" según la fase actual. */
  get siguientePasoTexto(): string {
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
        puesto: '',
        experienciaAnios: null,
        disponibilidad: '',
        fuenteCanalId: null,
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

    const canales = this.detalle.canales;
    const candidatos: LongListCandidatoEnvio[] = this.candidatos.map((c) => ({
      nombre: c.nombre.trim(),
      puesto: c.puesto.trim() || null,
      experienciaAnios: c.experienciaAnios,
      disponibilidad: c.disponibilidad.trim() || null,
      fuenteCanalId: c.fuenteCanalId,
      fuenteNombre: canales.find((canal) => canal.id === c.fuenteCanalId)?.nombre ?? null,
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
