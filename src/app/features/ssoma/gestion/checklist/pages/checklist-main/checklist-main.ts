import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ChecklistService } from '../../checklist.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import { environment } from '../../../../../../../environments/environment';
import {
  ChecklistPlantillaListDto,
  ChecklistPlantillaDetalleDto,
  ChecklistPlantillaItemDto,
  ChecklistProyectoCardDto,
  ChecklistProyectoDetalleDto,
  ChecklistProyectoItemDto,
  ChecklistPartidaDto,
  ChecklistPlantillaUpsertDto,
} from '../../checklist.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

type Tab = 'resumen' | 'partida' | 'plantillas';

@Component({
  selector: 'app-checklist-main',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    SearchInput,
    SearchSelect,
    DraggableImage,
    AbrilModalPanel,
    FabButton,
  ],
  templateUrl: './checklist-main.html',
  styleUrl: './checklist-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistMainComponent implements OnInit {
  private svc = inject(ChecklistService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  tab: Tab = 'resumen';

  // Proyectos
  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Resumen de checklists del proyecto
  checklistCards: ChecklistProyectoCardDto[] = [];
  loadingResumen = false;

  // "Por Proyecto" = todo checklist activo SIN partida (los obligatorios
  // generales como Inicio de Proyecto/Demolición, y cualquier opcional que se
  // haya activado — una vez activado, es igual de "hay que llenarlo" que un
  // obligatorio). Los de partida viven en su propio tab.
  get cardsGenerales(): ChecklistProyectoCardDto[] {
    return this.checklistCards.filter((c) => !c.partidaId);
  }

  // "Por Partida": agrupado por etapa constructiva, cada grupo con sus checklists.
  get gruposPorPartida(): { partidaId: number; partidaNombre: string; cards: ChecklistProyectoCardDto[] }[] {
    const grupos = new Map<number, { partidaId: number; partidaNombre: string; cards: ChecklistProyectoCardDto[] }>();
    for (const c of this.checklistCards) {
      if (!c.partidaId) continue;
      const grupo = grupos.get(c.partidaId);
      if (grupo) grupo.cards.push(c);
      else grupos.set(c.partidaId, { partidaId: c.partidaId, partidaNombre: c.partidaNombre ?? '—', cards: [c] });
    }
    return Array.from(grupos.values()).sort((a, b) => a.partidaNombre.localeCompare(b.partidaNombre));
  }

  // Catálogo de partidas (para asignarlas a una plantilla)
  partidas: ChecklistPartidaDto[] = [];
  nuevaPartidaNombre = '';
  creandoPartida = false;

  readonly apiOrigin = environment.apiUrl.replace(/\/$/, '');

  // Detalle de un checklist seleccionado
  detalleVisible = false;
  detalle: ChecklistProyectoDetalleDto | null = null;
  loadingDetalle = false;

  // Items guardando
  guardandoItemId: number | null = null;
  observacionTemp: { [itemId: number]: string } = {};

  // Activar checklist opcional
  plantillas: ChecklistPlantillaListDto[] = [];
  loadingPlantillas = false;

  plantillasSearchText = '';
  private readonly plantillasPager = new ClientPager<ChecklistPlantillaListDto>();

  get plantillasFiltradas(): ChecklistPlantillaListDto[] {
    return this.plantillas.filter(
      (p) => !this.plantillasSearchText.trim() || SearchInput.matches(p.nombre ?? '', this.plantillasSearchText),
    );
  }

  // Por partida y generales se muestran en secciones separadas — visualmente
  // distintas porque no se gestionan igual (por partida siempre obligatorio
  // y ligado a una etapa; general puede ser manual/opcional).
  get plantillasPorPartidaFiltradas(): ChecklistPlantillaListDto[] {
    // Orden por secuencia real de obra (el mismo "orden" que se ajusta con las
    // flechas subir/bajar en el catálogo de partidas), no alfabético — así la
    // columna "#" coincide con el orden visual de las filas, y la tabla refleja
    // cómo avanza la construcción (Excavación → Casco → Muro Anclado → Acabados),
    // no el alfabeto.
    return this.plantillasFiltradas
      .filter((p) => !!p.partidaId)
      .sort((a, b) => a.orden - b.orden || (a.partidaNombre ?? '').localeCompare(b.partidaNombre ?? ''));
  }

  get plantillasGeneralesFiltradas(): ChecklistPlantillaListDto[] {
    return this.plantillasFiltradas.filter((p) => !p.partidaId);
  }

  get plantillasCurrentPage(): number {
    return this.plantillasPager.currentPage;
  }

  get plantillasTotalPages(): number {
    return this.plantillasPager.totalPages(this.plantillasGeneralesFiltradas);
  }

  get plantillasPaged(): ChecklistPlantillaListDto[] {
    return this.plantillasPager.page(this.plantillasGeneralesFiltradas);
  }

  onPlantillasFilterChange(): void {
    this.plantillasPager.reset();
  }

  changePlantillasPage(page: number): void {
    this.plantillasPager.goTo(page);
  }

  // Ver plantilla como modelo (items) + edición cooperativa
  plantillaDetalleVisible = false;
  plantillaDetalle: ChecklistPlantillaDetalleDto | null = null;
  loadingPlantillaDetalle = false;
  editandoItemId: number | null = null;
  itemEditTexto = '';
  itemEditAdjunto = false;
  itemEditActivo = true;
  guardandoPlantillaItem = false;
  nuevoItemTexto = '';
  nuevoItemAdjunto = false;
  agregandoItem = false;
  showAgregarItemModal = false;
  activandoId: number | null = null;

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Por Proyecto', icono: 'ti-building', active: this.tab === 'resumen' },
      { label: 'Por Partida', icono: 'ti-stack-2', active: this.tab === 'partida' },
      { label: 'Crear o Modificar Checklist', icono: 'ti-template', active: this.tab === 'plantillas' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    if (t.label === 'Por Proyecto') this.setTab('resumen');
    else if (t.label === 'Por Partida') this.setTab('partida');
    else this.setTab('plantillas');
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'plantillas' && this.plantillas.length === 0) this.loadPlantillas();
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadProyectos();
    this.loadPartidas();
  }

  loadPartidas(): void {
    this.svc.getPartidas().subscribe({
      next: (res) => {
        this.partidas = res;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  crearPartida(): void {
    const nombre = this.nuevaPartidaNombre.trim();
    if (!nombre || this.creandoPartida) return;
    this.creandoPartida = true;
    this.cdr.markForCheck();
    this.svc.createPartida({ nombre, orden: this.partidas.length + 1 }).subscribe({
      next: (p) => {
        this.partidas = [...this.partidas, p];
        this.nuevaPartidaNombre = '';
        this.creandoPartida = false;
        // El backend ya creó su plantilla (vacía) y la propagó a los proyectos —
        // refrescar el catálogo para que aparezca de una vez.
        this.loadPlantillas();
        if (this.proyectoId) this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.creandoPartida = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // El orden importa: según avanza la obra se van colocando los requisitos en
  // secuencia (ej. Excavación antes que Estructuras). Mover intercambia el
  // "orden" con el vecino directo en la lista actual.
  moverPartida(partida: ChecklistPartidaDto, direccion: -1 | 1): void {
    const idx = this.partidas.findIndex((p) => p.id === partida.id);
    const vecinoIdx = idx + direccion;
    if (idx < 0 || vecinoIdx < 0 || vecinoIdx >= this.partidas.length) return;

    const vecino = this.partidas[vecinoIdx];
    const ordenA = partida.orden;
    const ordenB = vecino.orden;

    this.svc.updatePartida(partida.id, { nombre: partida.nombre, descripcion: partida.descripcion, orden: ordenB }).subscribe({
      next: () => {
        this.svc.updatePartida(vecino.id, { nombre: vecino.nombre, descripcion: vecino.descripcion, orden: ordenA }).subscribe({
          next: () => {
            partida.orden = ordenB;
            vecino.orden = ordenA;
            this.partidas = [...this.partidas].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
            this.cdr.markForCheck();
          },
          error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
        });
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  eliminarPartida(partida: ChecklistPartidaDto): void {
    Swal.fire({
      icon: 'warning',
      title: `¿Eliminar "${partida.nombre}"?`,
      text: 'Se borra la partida y su plantilla de checklist. Si algún proyecto ya completó ítems de esta partida, no se podrá eliminar.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deletePartida(partida.id).subscribe({
        next: () => {
          this.partidas = this.partidas.filter((p) => p.id !== partida.id);
          this.loadPlantillas();
          if (this.proyectoId) this.loadResumen();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  // Sedes administrativas que nunca tienen checklist de obra: se ocultan solo
  // en el selector de este módulo (siguen existiendo normalmente en el resto
  // del sistema — Arquitectura Comercial, otros reportes, etc.).
  private static readonly SEDES_SIN_CHECKLIST = ['oficina central', 'post venta', 'arquitectura central'];

  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({
            projectId: p.projectId,
            projectDescription: p.projectDescription,
          }))
          .filter(
            (p) => !ChecklistMainComponent.SEDES_SIN_CHECKLIST.includes(p.projectDescription.trim().toLowerCase()),
          )
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));

        if (!this.proyectoId && this.proyectos.length > 0) {
          this.seleccionarProyectoPorDefecto();
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // La vista nunca debe quedar vacía por falta de selección: se prioriza el
  // proyecto actual del usuario (su Worker vinculado), y si no tiene uno (o no
  // está en la lista habilitada), se cae al primero disponible alfabéticamente.
  private seleccionarProyectoPorDefecto(): void {
    this.svc.getMiProyectoActual().subscribe({
      next: (res) => {
        const enLista = res.proyectoId && this.proyectos.some((p) => p.projectId === res.proyectoId);
        this.proyectoId = enLista ? res.proyectoId! : this.proyectos[0].projectId;
        this.onProyectoChange();
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.proyectoId && this.proyectos.length > 0) {
          this.proyectoId = this.proyectos[0].projectId;
          this.onProyectoChange();
        }
      },
    });
  }

  onProyectoChange(): void {
    if (!this.proyectoId) {
      this.checklistCards = [];
      this.detalleVisible = false;
      this.cdr.markForCheck();
      return;
    }
    this.detalleVisible = false;
    this.loadResumen();
    if (this.plantillas.length === 0) this.loadPlantillas();
  }

  loadResumen(): void {
    if (!this.proyectoId) return;
    this.loadingResumen = true;
    this.cdr.markForCheck();
    this.svc.getResumenProyecto(this.proyectoId).subscribe({
      next: (res) => {
        this.checklistCards = res.checklists;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirDetalle(card: ChecklistProyectoCardDto): void {
    this.detalleVisible = true;
    this.detalle = null;
    this.loadingDetalle = true;
    this.observacionTemp = {};
    this.cdr.markForCheck();
    this.svc.getChecklistDetalle(card.checklistProyectoId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.detalleVisible = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalle = null;
    this.cdr.markForCheck();
  }

  // Evidencia de cumplimiento adjuntada por el usuario (opcional): se sube al
  // elegir el archivo y se guarda la URL acá hasta que se marque "completado".
  adjuntoTemp: { [itemId: number]: { url: string; nombre: string } } = {};
  subiendoAdjuntoId: number | null = null;

  onSeleccionarAdjunto(item: ChecklistProyectoItemDto, files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    this.subiendoAdjuntoId = item.id;
    this.cdr.markForCheck();
    this.svc.subirAdjuntoItem(file).subscribe({
      next: (res) => {
        this.adjuntoTemp[item.id] = { url: res.url, nombre: file.name };
        this.subiendoAdjuntoId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoAdjuntoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  quitarAdjuntoTemp(item: ChecklistProyectoItemDto): void {
    delete this.adjuntoTemp[item.id];
    this.cdr.markForCheck();
  }

  toggleItem(item: ChecklistProyectoItemDto): void {
    if (this.guardandoItemId === item.id) return;
    this.guardandoItemId = item.id;
    this.cdr.markForCheck();

    const nuevoEstado = !item.completado;
    const urlAdjunto = nuevoEstado ? this.adjuntoTemp[item.id]?.url || item.urlAdjunto : undefined;
    this.svc
      .toggleItem(item.id, {
        completado: nuevoEstado,
        observacion: this.observacionTemp[item.id] || undefined,
        urlAdjunto,
      })
      .subscribe({
        next: (res) => {
          item.completado = nuevoEstado;
          item.fechaCompletado = nuevoEstado ? new Date().toISOString() : undefined;
          item.urlAdjunto = urlAdjunto;
          if (nuevoEstado) delete this.adjuntoTemp[item.id];
          this.guardandoItemId = null;
          // Actualizar porcentaje en el detalle
          if (this.detalle) {
            this.detalle.porcentajeCompletado = res.porcentaje;
            this.detalle.estado = res.estado;
          }
          // Actualizar card del resumen
          const card = this.checklistCards.find(
            (c) => c.checklistProyectoId === this.detalle?.id,
          );
          if (card) {
            card.porcentajeCompletado = res.porcentaje;
            card.estado = res.estado as any;
            card.itemsCompletados = this.detalle!.items.filter((i) => i.completado).length;
          }
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoItemId = null;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Activar checklist opcional ────────────────────────────────────────────

  loadPlantillas(): void {
    this.loadingPlantillas = true;
    this.cdr.markForCheck();
    this.svc.getPlantillas().subscribe({
      next: (p) => {
        this.plantillas = p;
        this.plantillasPager.reset();
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Nueva plantilla (checklist por partida u opcional) ────────────────────

  showNuevaPlantillaModal = false;
  guardandoNuevaPlantilla = false;
  nuevaPlantillaForm: ChecklistPlantillaUpsertDto = this.nuevaPlantillaFormVacio();

  private nuevaPlantillaFormVacio(): ChecklistPlantillaUpsertDto {
    return {
      nombre: '',
      descripcion: '',
      tipoActivacion: 'manual',
      eventoActivacion: '',
      esObligatorio: false,
      orden: this.plantillas.length + 1,
      partidaId: undefined,
    };
  }

  // Al elegir partida, la plantilla es obligatoria para todos por definición
  // (se refleja acá para que no confunda, aunque el backend lo aplica igual).
  onNuevaPlantillaPartidaChange(partidaId: number | null): void {
    this.nuevaPlantillaForm.partidaId = partidaId ?? undefined;
    if (partidaId) {
      this.nuevaPlantillaForm.esObligatorio = true;
      this.nuevaPlantillaForm.tipoActivacion = 'automatico';
    }
    this.cdr.markForCheck();
  }

  abrirNuevaPlantilla(): void {
    this.nuevaPlantillaForm = this.nuevaPlantillaFormVacio();
    this.showNuevaPlantillaModal = true;
    this.cdr.markForCheck();
  }

  cerrarNuevaPlantillaModal(): void {
    this.showNuevaPlantillaModal = false;
    this.cdr.markForCheck();
  }

  get canGuardarNuevaPlantilla(): boolean {
    return !!(this.nuevaPlantillaForm.nombre.trim() && !this.guardandoNuevaPlantilla);
  }

  guardarNuevaPlantilla(): void {
    if (!this.canGuardarNuevaPlantilla) return;
    this.guardandoNuevaPlantilla = true;
    this.cdr.markForCheck();
    this.svc.createPlantilla(this.nuevaPlantillaForm).subscribe({
      next: () => {
        this.guardandoNuevaPlantilla = false;
        this.showNuevaPlantillaModal = false;
        this.loadPlantillas();
        // Si es obligatoria por partida, ya se propagó a todos los proyectos —
        // refrescar el resumen del proyecto actual para que aparezca de una vez.
        if (this.proyectoId) this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoNuevaPlantilla = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Ver plantilla como modelo (con items) ─────────────────────────────────

  verPlantilla(p: ChecklistPlantillaListDto): void {
    this.plantillaDetalleVisible = true;
    this.plantillaDetalle = null;
    this.loadingPlantillaDetalle = true;
    this.nuevoItemTexto = '';
    this.nuevoItemAdjunto = false;
    this.cdr.markForCheck();
    this.svc.getPlantillaDetalle(p.id).subscribe({
      next: (d) => {
        this.plantillaDetalle = d;
        this.loadingPlantillaDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPlantillaDetalle = false;
        this.plantillaDetalleVisible = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarPlantillaDetalle(): void {
    this.plantillaDetalleVisible = false;
    this.plantillaDetalle = null;
    this.editandoItemId = null;
    this.cdr.markForCheck();
  }

  // ─── Partida de la plantilla ────────────────────────────────────────────────

  cambiarPartidaPlantilla(partidaIdRaw: string): void {
    if (!this.plantillaDetalle) return;
    const partidaId = partidaIdRaw ? Number(partidaIdRaw) : undefined;
    this.svc
      .updatePlantilla(this.plantillaDetalle.id, {
        nombre: this.plantillaDetalle.nombre,
        descripcion: this.plantillaDetalle.descripcion,
        tipoActivacion: this.plantillaDetalle.tipoActivacion,
        eventoActivacion: this.plantillaDetalle.eventoActivacion,
        esObligatorio: this.plantillaDetalle.esObligatorio,
        orden: this.plantillaDetalle.orden,
        partidaId,
      })
      .subscribe({
        next: () => {
          const partida = this.partidas.find((p) => p.id === partidaId);
          this.plantillaDetalle!.partidaId = partidaId;
          this.plantillaDetalle!.partidaNombre = partida?.nombre;
          const row = this.plantillas.find((p) => p.id === this.plantillaDetalle!.id);
          if (row) {
            row.partidaId = partidaId;
            row.partidaNombre = partida?.nombre;
          }
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
  }

  // ─── Imágenes de referencia de un item ("cómo debe quedar") ────────────────

  subiendoImagenItemId: number | null = null;

  onSeleccionarImagenes(item: ChecklistPlantillaItemDto, files: FileList | null): void {
    if (!files || files.length === 0) return;
    this.subiendoImagenItemId = item.id;
    this.cdr.markForCheck();

    const uploads = Array.from(files).map((file) => this.svc.subirImagenReferencia(item.id, file));
    let pendientes = uploads.length;
    for (const upload$ of uploads) {
      upload$.subscribe({
        next: (imagen) => {
          item.imagenesReferencia = [...item.imagenesReferencia, imagen];
          const card = this.plantillaDetalle?.items.find((i) => i.id === item.id);
          if (card && card !== item) card.imagenesReferencia = item.imagenesReferencia;
          if (--pendientes === 0) this.subiendoImagenItemId = null;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          if (--pendientes === 0) this.subiendoImagenItemId = null;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
    }
  }

  async eliminarImagenItem(item: ChecklistPlantillaItemDto, imagenId: number): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar foto de referencia?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;

    this.svc.eliminarImagenReferencia(imagenId).subscribe({
      next: () => {
        item.imagenesReferencia = item.imagenesReferencia.filter((img) => img.id !== imagenId);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  abrirAgregarItemModal(): void {
    this.nuevoItemTexto = '';
    this.nuevoItemAdjunto = false;
    this.showAgregarItemModal = true;
    this.cdr.markForCheck();
  }

  cerrarAgregarItemModal(): void {
    this.showAgregarItemModal = false;
    this.cdr.markForCheck();
  }

  agregarItemPlantilla(): void {
    if (!this.plantillaDetalle || !this.nuevoItemTexto.trim() || this.agregandoItem) return;
    this.agregandoItem = true;
    this.cdr.markForCheck();
    this.svc
      .addItemToPlantilla(this.plantillaDetalle.id, {
        descripcion: this.nuevoItemTexto.trim(),
        tieneAdjuntoRef: this.nuevoItemAdjunto,
      })
      .subscribe({
        next: (item) => {
          this.plantillaDetalle!.items.push(item);
          this.plantillaDetalle!.totalItems = this.plantillaDetalle!.items.length;
          const card = this.plantillas.find((pl) => pl.id === this.plantillaDetalle!.id);
          if (card) card.totalItems = this.plantillaDetalle!.totalItems;
          this.nuevoItemTexto = '';
          this.nuevoItemAdjunto = false;
          this.agregandoItem = false;
          this.showAgregarItemModal = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.agregandoItem = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  editarItemPlantilla(item: ChecklistPlantillaItemDto): void {
    this.editandoItemId = item.id;
    this.itemEditTexto = item.descripcion;
    this.itemEditAdjunto = item.tieneAdjuntoRef;
    this.itemEditActivo = item.activo;
    this.cdr.markForCheck();
  }

  cancelarEdicionItem(): void {
    this.editandoItemId = null;
    this.cdr.markForCheck();
  }

  guardarItemPlantilla(item: ChecklistPlantillaItemDto): void {
    if (!this.itemEditTexto.trim() || this.guardandoPlantillaItem) return;
    this.guardandoPlantillaItem = true;
    this.cdr.markForCheck();
    this.svc
      .updatePlantillaItem(item.id, {
        descripcion: this.itemEditTexto.trim(),
        tieneAdjuntoRef: this.itemEditAdjunto,
        activo: this.itemEditActivo,
      })
      .subscribe({
        next: () => {
          item.descripcion = this.itemEditTexto.trim();
          item.tieneAdjuntoRef = this.itemEditAdjunto;
          item.activo = this.itemEditActivo;
          this.guardandoPlantillaItem = false;
          this.editandoItemId = null;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoPlantillaItem = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // El orden de los ítems refleja la secuencia real de avance de obra —
  // intercambia el "orden" con el ítem vecino (arriba/abajo) en la lista.
  moviendoItemId: number | null = null;

  moverItemPlantilla(item: ChecklistPlantillaItemDto, direccion: -1 | 1): void {
    if (!this.plantillaDetalle || this.moviendoItemId === item.id) return;
    const items = this.plantillaDetalle.items;
    const idx = items.findIndex((i) => i.id === item.id);
    const vecinoIdx = idx + direccion;
    if (idx < 0 || vecinoIdx < 0 || vecinoIdx >= items.length) return;

    const vecino = items[vecinoIdx];
    const ordenA = item.orden;
    const ordenB = vecino.orden;
    this.moviendoItemId = item.id;
    this.cdr.markForCheck();

    this.svc.setOrdenItem(item.id, ordenB).subscribe({
      next: () => {
        this.svc.setOrdenItem(vecino.id, ordenA).subscribe({
          next: () => {
            item.orden = ordenB;
            vecino.orden = ordenA;
            this.plantillaDetalle!.items = [...items].sort((a, b) => a.orden - b.orden);
            this.moviendoItemId = null;
            this.cdr.markForCheck();
          },
          error: (err: HttpErrorResponse) => {
            this.moviendoItemId = null;
            this.errorSvc.handleError(err);
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.moviendoItemId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  activarChecklist(plantillaId: number): void {
    if (!this.proyectoId || this.activandoId === plantillaId) return;
    this.activandoId = plantillaId;
    this.cdr.markForCheck();
    this.svc.activarChecklist(this.proyectoId, { plantillaId }).subscribe({
      next: () => {
        this.activandoId = null;
        this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.activandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  plantillaYaActiva(plantillaId: number): boolean {
    return this.checklistCards.some((c) => c.plantillaId === plantillaId);
  }

  // Solo se puede desactivar mientras no se haya llenado nada — si ya hay
  // ítems completados, se conserva como historial y no se ofrece la opción.
  puedeDesactivar(plantillaId: number): boolean {
    const card = this.checklistCards.find((c) => c.plantillaId === plantillaId);
    return !!card && card.itemsCompletados === 0;
  }

  desactivarChecklist(plantillaId: number): void {
    const card = this.checklistCards.find((c) => c.plantillaId === plantillaId);
    if (!card || this.activandoId === plantillaId) return;
    this.activandoId = plantillaId;
    this.cdr.markForCheck();
    this.svc.desactivarChecklist(card.checklistProyectoId).subscribe({
      next: () => {
        this.activandoId = null;
        this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.activandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  estadoClass(estado: string): string {
    switch (estado) {
      case 'completado': return 'estado-completado';
      case 'en_progreso': return 'estado-en-progreso';
      case 'no_aplica': return 'estado-no-aplica';
      default: return 'estado-pendiente';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'en_progreso': return 'En progreso';
      case 'no_aplica': return 'No aplica';
      default: return 'Pendiente';
    }
  }

  porcentajeColor(pct: number): string {
    if (pct === 100) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#1e3a5f';
  }

  // ─── "No aplica": proyectos avanzados que ya pasaron esa etapa, u obligatorio
  // que no les corresponde. Requiere motivo — queda de auditoría. ────────────

  showNoAplicaModal = false;
  noAplicaCard: ChecklistProyectoCardDto | null = null;
  noAplicaMotivoTexto = '';
  guardandoNoAplica = false;

  abrirNoAplicaModal(card: ChecklistProyectoCardDto): void {
    this.noAplicaCard = card;
    this.noAplicaMotivoTexto = '';
    this.showNoAplicaModal = true;
    this.cdr.markForCheck();
  }

  cerrarNoAplicaModal(): void {
    this.showNoAplicaModal = false;
    this.noAplicaCard = null;
    this.cdr.markForCheck();
  }

  get canConfirmarNoAplica(): boolean {
    return !!(this.noAplicaMotivoTexto.trim() && !this.guardandoNoAplica);
  }

  confirmarNoAplica(): void {
    if (!this.noAplicaCard || !this.canConfirmarNoAplica) return;
    this.guardandoNoAplica = true;
    this.cdr.markForCheck();
    this.svc.marcarNoAplica(this.noAplicaCard.checklistProyectoId, { motivo: this.noAplicaMotivoTexto.trim() }).subscribe({
      next: () => {
        this.guardandoNoAplica = false;
        this.showNoAplicaModal = false;
        this.noAplicaCard = null;
        this.loadResumen();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoNoAplica = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  reactivarChecklist(card: ChecklistProyectoCardDto): void {
    this.svc.reactivarChecklist(card.checklistProyectoId).subscribe({
      next: () => this.loadResumen(),
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  reactivarDetalle(): void {
    if (!this.detalle) return;
    this.svc.reactivarChecklist(this.detalle.id).subscribe({
      next: () => {
        if (this.detalle) this.abrirDetalle({ checklistProyectoId: this.detalle.id } as ChecklistProyectoCardDto);
        this.loadResumen();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }
}
