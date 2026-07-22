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
import { ReclutamientoService } from '../../services/reclutamiento.service';
import { AsignacionGth, DetalleRequerimientoGth, Opcion } from '../../dtos/reclutamiento.dto';
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
  imports: [CommonModule, FormsModule, AbrilModalPanel, StatusBadge, SearchSelect, TitleCasePipe],
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

  /** Texto del recuadro "Siguiente paso" según la fase actual. */
  get siguientePasoTexto(): string {
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
