import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import { Finalista, OpcionDto, RevisionFinalistas } from '../../dtos/solicitud-personal.dto';

/**
 * Modal "Finalistas enviados por GTH" (vista del solicitante): lista los candidatos que GTH ya
 * entrevistó y evaluó, con los comentarios del informe (resultado de la entrevista, informe
 * psicotécnico y recomendación de GTH) y el link a su CV.
 *
 * Sobre el finalista seleccionado se toma la decisión final (RF-REC-24):
 *  - Aprobarlo cierra el proceso de reclutamiento; el seleccionado pasa al proceso de onboarding.
 *  - Rechazarlo le envía el mismo correo de fin de proceso que manda GTH a quien no continúa; si
 *    con eso no queda ningún finalista, el requerimiento vuelve al paso en el que GTH envía la
 *    long list/CVs al solicitante (RF-REC-25).
 */
@Component({
  standalone: true,
  selector: 'app-gth-revision-finalistas',
  imports: [CommonModule, AbrilModalPanel, TitleCasePipe, SearchSelect],
  templateUrl: './revision-finalistas.html',
})
export class GthRevisionFinalistas implements OnInit {
  /** Id del requerimiento cuyo informe de finalistas se muestra. */
  @Input({ required: true }) requerimientoId!: number;
  @Output() closeModal = new EventEmitter<void>();
  /** Emite cuando se registró una decisión (para que el panel del solicitante se recargue). */
  @Output() decided = new EventEmitter<void>();

  revision: RevisionFinalistas | null = null;

  /** Finalista cuyo informe se muestra en el panel derecho (por defecto, el primero). */
  seleccionado: Finalista | null = null;

  /** true mientras se registra una decisión (evita doble envío). */
  decidiendo = false;

  /**
   * Área a la que entra el seleccionado. Solo se elige cuando el puesto pertenece a dos o más
   * áreas; con una sola queda fijada en esa y con ninguna se deja en null (el backend cae al área
   * del solicitante, que es lo que se usaba antes de esta regla).
   */
  areaDestinoId: number | null = null;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar({ cerrarSiFalla: true });
  }

  /**
   * Carga (o recarga) el informe.
   *  - `cerrarSiFalla`: cierra el modal cuando la primera carga falla.
   *  - `irAPendiente`: tras decidir sobre un finalista, deja mostrado al siguiente que aún no
   *    tiene decisión (en vez de quedarse en el que se acaba de rechazar).
   */
  private cargar(opts: { cerrarSiFalla?: boolean; irAPendiente?: boolean } = {}): void {
    this.loaderService.show();
    this.service.getRevisionFinalistas(this.requerimientoId).subscribe({
      next: (data) => {
        const previo = this.seleccionado?.candidatoId;
        this.revision = data;
        this.seleccionado = opts.irAPendiente
          ? data.finalistas.find((f) => !this.estaDecidido(f)) ?? data.finalistas[0] ?? null
          : data.finalistas.find((f) => f.candidatoId === previo) ?? data.finalistas[0] ?? null;
        // Con una sola área no hay nada que preguntar: se fija sola. Con varias se conserva la
        // que ya eligió, porque acá se recarga tras cada rechazo y no tiene por qué volver a
        // elegirla; solo se limpia si dejó de ser una opción válida.
        const areas = data.areasDestino ?? [];
        this.areaDestinoId =
          areas.length === 1
            ? areas[0].id
            : areas.some((a) => a.id === this.areaDestinoId)
              ? this.areaDestinoId
              : null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        if (opts.cerrarSiFalla) this.closeModal.emit();
      },
    });
  }

  /** Subtítulo del header: "REQ-AAAA-NNNN · Puesto". */
  get subtitulo(): string {
    if (!this.revision) return '';
    const puesto = this.revision.puesto ? new TitleCasePipe().transform(this.revision.puesto) : '';
    return puesto ? `${this.revision.codigo} · ${puesto}` : this.revision.codigo;
  }

  get total(): number {
    return this.revision?.finalistas.length ?? 0;
  }

  seleccionar(f: Finalista): void {
    this.seleccionado = f;
  }

  /** Iniciales para el avatar del finalista (máx. 2 letras). */
  iniciales(nombre: string): string {
    const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + second).toUpperCase();
  }

  /** Nombre del archivo del CV (o uno derivado del nombre si GTH no lo cargó con nombre). */
  nombreCv(f: Finalista): string {
    return f.cvNombre || `CV_${f.nombre}.pdf`;
  }

  // ── Área a la que entra el seleccionado ─────────────────────────────────
  /** Áreas del puesto entre las que se elige (vacío si el puesto no tiene ninguna mapeada). */
  get areasDestino(): OpcionDto[] {
    return this.revision?.areasDestino ?? [];
  }

  /** true si hay que preguntar el área: el puesto pertenece a más de una. */
  get eligeArea(): boolean {
    return this.areasDestino.length > 1;
  }

  /** Área única del puesto, para informarla sin desplegable. null si hay varias o ninguna. */
  get areaUnica(): OpcionDto | null {
    return this.areasDestino.length === 1 ? this.areasDestino[0] : null;
  }

  /** Con varias áreas no se puede aprobar sin elegir una: es el área de la ficha del seleccionado. */
  get areaDestinoValida(): boolean {
    return !this.eligeArea || !!this.areaDestinoId;
  }

  // ── Decisión final sobre el finalista ───────────────────────────────────
  /** true si el finalista ya fue aprobado por el solicitante. */
  esSeleccionado(f: Finalista): boolean {
    return f.evaluacion.resultadoCodigo === 'SELECCIONADO';
  }

  /** true si el finalista ya fue rechazado por el solicitante. */
  esRechazado(f: Finalista): boolean {
    return f.evaluacion.resultadoCodigo === 'RECHAZADO';
  }

  /** true si sobre el finalista ya se tomó una decisión (aprobado o rechazado). */
  estaDecidido(f: Finalista): boolean {
    return this.esSeleccionado(f) || this.esRechazado(f);
  }

  /** true si el proceso ya se cerró: alguien fue seleccionado y no hay más decisiones que tomar. */
  get procesoCerrado(): boolean {
    return (this.revision?.finalistas ?? []).some((f) => this.esSeleccionado(f));
  }

  /** Solo se decide sobre el finalista mostrado, si sigue pendiente y el proceso no está cerrado. */
  get puedeDecidir(): boolean {
    return (
      !!this.seleccionado && !this.estaDecidido(this.seleccionado) && !this.procesoCerrado && !this.decidiendo
    );
  }

  /**
   * Aprueba al finalista mostrado: el puesto queda cubierto y GTH le programa su EMO de ingreso.
   * Al aprobar, los finalistas que seguían en carrera quedan fuera y reciben el correo de fin de
   * proceso, así que se avisa en el diálogo: es un correo a terceros que se dispara con este clic.
   */
  async aprobar(): Promise<void> {
    const f = this.seleccionado;
    if (!f || !this.puedeDecidir) return;

    // El área queda en la ficha del seleccionado y con ella se resuelve su jefatura al
    // programarle el EMO de ingreso: con varias opciones no se puede adivinar.
    if (!this.areaDestinoValida) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el área de destino',
        text: 'Este puesto pertenece a más de un área: elige a cuál entra el postulante antes de aprobarlo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#005D9D',
      });
      return;
    }

    const otros = this.pendientes - 1;
    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Aprobar a este finalista?',
      html:
        `Se enviará a GTH tu decisión de continuar con <b>${new TitleCasePipe().transform(f.nombre)}</b>. ` +
        'Con esto el puesto queda cubierto y GTH le programará su examen médico de ingreso.' +
        (this.areaDestinoNombre ? ` Ingresará al área de <b>${this.areaDestinoNombre}</b>.` : '') +
        (otros > 0
          ? ` Los otros <b>${otros}</b> finalista(s) quedarán fuera del proceso y recibirán el correo de fin de proceso.`
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar y enviar a GTH',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#005D9D',
    });
    if (!confirm.isConfirmed) return;

    this.decidir(f, true);
  }

  /** Rechaza al finalista mostrado: se le envía el correo de fin de proceso. */
  async rechazar(): Promise<void> {
    const f = this.seleccionado;
    if (!f || !this.puedeDecidir) return;

    const ultimo = this.pendientes === 1;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Rechazar a este finalista?',
      html:
        `Se le enviará a <b>${new TitleCasePipe().transform(f.nombre)}</b> el correo de fin de proceso ` +
        'y quedará fuera del proceso.' +
        (ultimo
          ? ' Es el último finalista en carrera: al rechazarlo, el requerimiento volverá al paso en el que GTH envía la long list y los CVs.'
          : ''),
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar finalista',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
    });
    if (!confirm.isConfirmed) return;

    this.decidir(f, false);
  }

  /** Nombre del área a la que entra el seleccionado, para confirmarlo antes de aprobar. */
  get areaDestinoNombre(): string | null {
    return this.areasDestino.find((a) => a.id === this.areaDestinoId)?.nombre ?? null;
  }

  /** Finalistas que todavía no tienen decisión del solicitante. */
  get pendientes(): number {
    return (this.revision?.finalistas ?? []).filter((f) => !this.estaDecidido(f)).length;
  }

  private decidir(f: Finalista, aprobado: boolean): void {
    this.decidiendo = true;
    this.loaderService.show();
    // El área solo viaja al aprobar: al rechazar no hay ficha que crear.
    const areaScopeId = aprobado ? this.areaDestinoId : null;
    this.service.decidirFinalista(this.requerimientoId, f.candidatoId, aprobado, areaScopeId).subscribe({
      next: (res) => {
        this.decidiendo = false;
        this.loaderService.hide();
        this.decided.emit();

        Swal.fire({
          icon: res.aprobado ? 'success' : res.todosRechazados ? 'info' : 'success',
          title: res.aprobado
            ? 'Selección final enviada'
            : res.todosRechazados
              ? 'Finalista rechazado'
              : 'Finalista rechazado',
          text: res.message,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#005D9D',
        });

        // Al aprobar (proceso cerrado) o al rechazar al último finalista ya no queda nada que
        // revisar: se cierra el modal. Si aún quedan finalistas, se recarga para pintar el badge
        // y se deja mostrado al siguiente pendiente, que es sobre el que toca decidir.
        if (res.aprobado || res.todosRechazados) this.closeModal.emit();
        else this.cargar({ irAPendiente: true });
      },
      error: (err: HttpErrorResponse) => {
        this.decidiendo = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }
}
