import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MilestoneService } from '../../../../../core/services/milestone.service';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MilestoneCreateDTO } from '../../../../../core/dtos/milestone/milestoneCreate.model';
import { MilestoneEditDTO } from '../../../../../core/dtos/milestone/milestoneEdit.model';
import { MilestoneGetDTO } from '../../../../../core/dtos/milestone/milestone.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { ProyectoService } from '../../../../configuracion/features/proyectos/services/proyecto.service';
import { ProjectDto } from '../../../../configuracion/features/proyectos/dtos/project.dto';
import { ProjectEditDto } from '../../../../configuracion/features/proyectos/dtos/project-edit.dto';
import { PlantillaCronogramaService } from '../../services/plantilla-cronograma.service';
import { PlantillaItemDto, TipoCronogramaPlantilla } from '../../dtos/plantilla-cronograma.dtos';

type MilestonesTab = 'hitos' | 'proyectos' | 'plantillas';

import { PROJECTS_TABS } from '../../../shared/projects-tabs';
@Component({
  selector: 'app-milestones',
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './milestones.html',
  styleUrl: './milestones.css',
})
export class Milestones implements OnInit {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();

  activeTab: MilestonesTab = 'hitos';

  milestones: MilestoneGetDTO[] = [];
  createDto: MilestoneCreateDTO = {
    milestoneDescription: '',
    active: true,
  };
  editDto: MilestoneEditDTO = {
    milestoneId: 0,
    milestoneDescription: '',
    active: true,
  };

  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  // ── Pestaña "Proyectos Activos" ──────────────────────────────────────────
  proyectos: PagedResponseDTO<ProjectDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  proyectosLoading = false;
  proyectosCurrentPage = 1;
  proyectosTotalPages = 0;
  proyectosTotalRecords = 0;
  togglingProjectId: number | null = null;
  /** Lock independiente del de "Activo": son dos toggles distintos, no deben bloquearse entre sí. */
  togglingUdpProjectId: number | null = null;
  /** Filtro en memoria sobre `proyectos.data` (la página ya trae hasta 200 registros, ver loadProyectos). */
  soloSinUdp = false;

  // ── Pestaña "Plantillas de Cronograma" ───────────────────────────────────
  readonly etapasPlantilla: { value: TipoCronogramaPlantilla; label: string }[] = [
    { value: 'ANTEPROYECTO', label: 'Anteproyecto' },
    { value: 'PROYECTO', label: 'Proyecto' },
    { value: 'PROYECTO_ACTUALIZACION', label: 'Proyecto de Actualización' },
  ];
  etapaPlantillaActiva: TipoCronogramaPlantilla = 'ANTEPROYECTO';
  plantillaItems: PlantillaItemDto[] = [];
  plantillaLoading = false;

  showPlantillaModal = false;
  plantillaModalMode: 'crear' | 'editar' = 'crear';
  plantillaForm: { id: number | null; codigo: string; nombre: string; predecesoraCodigo: string | null } = {
    id: null,
    codigo: '',
    nombre: '',
    predecesoraCodigo: null,
  };
  private plantillaParentContextCodigo: string | null = null;
  private plantillaParentContextNivel = -1;
  private plantillaEditandoItem: PlantillaItemDto | null = null;

  constructor(
    private milestoneService: MilestoneService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private proyectoService: ProyectoService,
    private plantillaCronogramaService: PlantillaCronogramaService,
  ) {}

  ngOnInit(): void {
    this.loadMilestones();
  }

  setTab(tab: MilestonesTab): void {
    this.activeTab = tab;
    if (tab === 'proyectos' && this.proyectos.data.length === 0 && !this.proyectosLoading) {
      this.loadProyectos(1);
    }
    if (tab === 'plantillas' && this.plantillaItems.length === 0 && !this.plantillaLoading) {
      this.loadPlantillaItems();
    }
  }

  selectEtapaPlantilla(etapa: TipoCronogramaPlantilla): void {
    if (etapa === this.etapaPlantillaActiva) return;
    this.etapaPlantillaActiva = etapa;
    this.loadPlantillaItems();
  }

  loadPlantillaItems(): void {
    this.plantillaLoading = true;
    this.cdr.detectChanges();

    this.plantillaCronogramaService.getByTipo(this.etapaPlantillaActiva).subscribe({
      next: (response) => {
        this.plantillaItems = response.items;
        this.plantillaLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.plantillaLoading = false;
        this.error(err);
      },
    });
  }

  // ── Árbol de plantilla: navegación por rangos de subárbol ────────────────
  // `plantillaItems` ya llega ordenado por `orden` desde el backend, así que es
  // un outline plano válido: el subárbol de un ítem es él mismo + la corrida
  // contigua de ítems siguientes con `nivel` mayor, hasta el primero que no lo sea.
  private indexOfPlantillaItem(item: PlantillaItemDto): number {
    return this.plantillaItems.findIndex((i) => i.id === item.id);
  }

  private subtreeRange(item: PlantillaItemDto): { start: number; end: number } {
    const start = this.indexOfPlantillaItem(item);
    let end = start;
    for (let i = start + 1; i < this.plantillaItems.length; i++) {
      if (this.plantillaItems[i].nivel <= item.nivel) break;
      end = i;
    }
    return { start, end };
  }

  private buscarSiblingAnterior(item: PlantillaItemDto): PlantillaItemDto | null {
    const start = this.indexOfPlantillaItem(item);
    for (let i = start - 1; i >= 0; i--) {
      const cur = this.plantillaItems[i];
      if (cur.nivel < item.nivel) break;
      if (cur.nivel === item.nivel && cur.parentCodigo === item.parentCodigo) return cur;
    }
    return null;
  }

  private buscarSiblingSiguiente(item: PlantillaItemDto): PlantillaItemDto | null {
    const { end } = this.subtreeRange(item);
    const candidato = this.plantillaItems[end + 1];
    if (candidato && candidato.nivel === item.nivel && candidato.parentCodigo === item.parentCodigo) {
      return candidato;
    }
    return null;
  }

  /** Reordena el array [start,end] a la posición `destinoOriginal` (índice en el array actual). Solo mueve, no persiste. */
  private reposicionarBloque(start: number, end: number, destinoOriginal: number): void {
    const bloque = this.plantillaItems.slice(start, end + 1);
    const resto = [...this.plantillaItems.slice(0, start), ...this.plantillaItems.slice(end + 1)];
    let destino = destinoOriginal;
    if (destino > end) destino -= bloque.length;
    this.plantillaItems = [...resto.slice(0, destino), ...bloque, ...resto.slice(destino)];
  }

  canMoverArriba(item: PlantillaItemDto): boolean {
    return this.buscarSiblingAnterior(item) !== null;
  }

  canMoverAbajo(item: PlantillaItemDto): boolean {
    return this.buscarSiblingSiguiente(item) !== null;
  }

  canSubirNivelPlantilla(item: PlantillaItemDto): boolean {
    return item.nivel > 0;
  }

  canBajarNivelPlantilla(item: PlantillaItemDto): boolean {
    return this.buscarSiblingAnterior(item) !== null;
  }

  moverArribaPlantilla(item: PlantillaItemDto): void {
    const prevSibling = this.buscarSiblingAnterior(item);
    if (!prevSibling) return;
    const antes = this.plantillaItems.map((i) => ({ ...i }));
    const { start, end } = this.subtreeRange(item);
    const { start: prevStart } = this.subtreeRange(prevSibling);
    this.reposicionarBloque(start, end, prevStart);
    this.persistirCambiosEstructura(antes);
  }

  moverAbajoPlantilla(item: PlantillaItemDto): void {
    const nextSibling = this.buscarSiblingSiguiente(item);
    if (!nextSibling) return;
    const antes = this.plantillaItems.map((i) => ({ ...i }));
    const { start, end } = this.subtreeRange(item);
    const { end: nextEnd } = this.subtreeRange(nextSibling);
    this.reposicionarBloque(start, end, nextEnd + 1);
    this.persistirCambiosEstructura(antes);
  }

  /** Sube de nivel (outdent): pasa a ser hermano de su padre actual, justo después de todo el subárbol de ese padre. */
  subirNivelPlantilla(item: PlantillaItemDto): void {
    if (item.nivel <= 0) return;
    const parent = this.plantillaItems.find((p) => p.codigo === item.parentCodigo);
    if (!parent) return;

    const antes = this.plantillaItems.map((i) => ({ ...i }));
    const { start, end } = this.subtreeRange(item);
    const { end: parentEnd } = this.subtreeRange(parent);
    const nuevoParentCodigo = parent.parentCodigo;

    for (let i = start; i <= end; i++) {
      this.plantillaItems[i].nivel -= 1;
    }
    this.plantillaItems[start].parentCodigo = nuevoParentCodigo;

    this.reposicionarBloque(start, end, parentEnd + 1);
    this.persistirCambiosEstructura(antes);
  }

  /** Baja de nivel (indent): pasa a ser el último hijo de su hermano anterior. Al ser adyacentes, no cambia de posición. */
  bajarNivelPlantilla(item: PlantillaItemDto): void {
    const prevSibling = this.buscarSiblingAnterior(item);
    if (!prevSibling) return;

    const antes = this.plantillaItems.map((i) => ({ ...i }));
    const { start, end } = this.subtreeRange(item);

    for (let i = start; i <= end; i++) {
      this.plantillaItems[i].nivel += 1;
    }
    this.plantillaItems[start].parentCodigo = prevSibling.codigo;

    this.persistirCambiosEstructura(antes);
  }

  private recomputeEsPadre(items: PlantillaItemDto[]): void {
    for (const it of items) {
      it.esPadre = items.some((x) => x.parentCodigo === it.codigo);
    }
  }

  /**
   * Recalcula `orden` (según la posición actual del array) y `esPadre`, compara contra el
   * estado previo y solo hace PUT de los ítems que realmente cambiaron. No hay endpoint de
   * reorden masivo en plantillas (a diferencia de cronograma-actividades), así que cada
   * cambio estructural (mover, subir/bajar nivel, crear) se resuelve con varios PUT en batch.
   */
  private persistirCambiosEstructura(antes: PlantillaItemDto[]): void {
    const antesPorId = new Map(antes.map((i) => [i.id, i]));

    this.plantillaItems.forEach((item, index) => {
      item.orden = index + 1;
    });
    this.recomputeEsPadre(this.plantillaItems);
    this.cdr.detectChanges();

    const cambios = this.plantillaItems.filter((item) => {
      const prev = antesPorId.get(item.id);
      if (!prev) return true;
      return (
        prev.orden !== item.orden ||
        prev.nivel !== item.nivel ||
        prev.parentCodigo !== item.parentCodigo ||
        prev.esPadre !== item.esPadre
      );
    });

    if (cambios.length === 0) return;

    this.loader = true;
    this.cdr.detectChanges();

    const requests = cambios.map((item) =>
      this.plantillaCronogramaService.editarItem(item.id, {
        codigo: item.codigo,
        nombre: item.nombre,
        nivel: item.nivel,
        esPadre: item.esPadre,
        parentCodigo: item.parentCodigo,
        predecesoraCodigo: item.predecesoraCodigo,
        orden: item.orden,
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.loader = false;
        this.loadPlantillaItems();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
        this.loadPlantillaItems();
      },
    });
  }

  // ── Modal crear/editar ítem de plantilla ─────────────────────────────────
  get predecesoraOpciones(): PlantillaItemDto[] {
    return this.plantillaItems.filter((i) => i.id !== this.plantillaForm.id);
  }

  abrirModalAgregarRaiz(): void {
    this.plantillaModalMode = 'crear';
    this.plantillaParentContextCodigo = null;
    this.plantillaParentContextNivel = -1;
    this.plantillaForm = { id: null, codigo: '', nombre: '', predecesoraCodigo: null };
    this.showPlantillaModal = true;
  }

  abrirModalAgregarHijo(parent: PlantillaItemDto): void {
    this.plantillaModalMode = 'crear';
    this.plantillaParentContextCodigo = parent.codigo;
    this.plantillaParentContextNivel = parent.nivel;
    this.plantillaForm = { id: null, codigo: '', nombre: '', predecesoraCodigo: null };
    this.showPlantillaModal = true;
  }

  abrirModalEditarPlantilla(item: PlantillaItemDto): void {
    this.plantillaModalMode = 'editar';
    this.plantillaEditandoItem = item;
    this.plantillaForm = {
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      predecesoraCodigo: item.predecesoraCodigo,
    };
    this.showPlantillaModal = true;
  }

  cerrarModalPlantilla(): void {
    this.showPlantillaModal = false;
  }

  guardarPlantillaItem(): void {
    if (!this.plantillaForm.codigo.trim() || !this.plantillaForm.nombre.trim()) return;

    if (this.plantillaModalMode === 'crear') {
      this.crearPlantillaItem();
    } else {
      this.editarPlantillaItem();
    }
  }

  private crearPlantillaItem(): void {
    const nivel = this.plantillaParentContextNivel + 1;
    this.loader = true;
    this.cdr.detectChanges();

    this.plantillaCronogramaService
      .crearItem({
        tipoCronograma: this.etapaPlantillaActiva,
        codigo: this.plantillaForm.codigo.trim(),
        nombre: this.plantillaForm.nombre.trim(),
        nivel,
        esPadre: false,
        parentCodigo: this.plantillaParentContextCodigo,
        predecesoraCodigo: this.plantillaForm.predecesoraCodigo,
        orden: this.plantillaItems.length + 1,
      })
      .subscribe({
        next: (nuevo) => {
          const antes = this.plantillaItems.map((i) => ({ ...i }));

          let destino = this.plantillaItems.length;
          if (this.plantillaParentContextCodigo) {
            const parent = this.plantillaItems.find((p) => p.codigo === this.plantillaParentContextCodigo);
            if (parent) destino = this.subtreeRange(parent).end + 1;
          }
          this.plantillaItems = [
            ...this.plantillaItems.slice(0, destino),
            nuevo,
            ...this.plantillaItems.slice(destino),
          ];
          antes.push({ ...nuevo });

          this.showPlantillaModal = false;
          this.loader = false;
          this.persistirCambiosEstructura(antes);
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  private editarPlantillaItem(): void {
    if (!this.plantillaEditandoItem) return;
    const item = this.plantillaEditandoItem;
    this.loader = true;
    this.cdr.detectChanges();

    this.plantillaCronogramaService
      .editarItem(item.id, {
        codigo: this.plantillaForm.codigo.trim(),
        nombre: this.plantillaForm.nombre.trim(),
        nivel: item.nivel,
        esPadre: item.esPadre,
        parentCodigo: item.parentCodigo,
        predecesoraCodigo: this.plantillaForm.predecesoraCodigo,
        orden: item.orden,
      })
      .subscribe({
        next: () => {
          this.showPlantillaModal = false;
          this.loader = false;
          this.loadPlantillaItems();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  eliminarPlantillaItem(item: PlantillaItemDto): void {
    const tieneHijos = this.plantillaItems.some((i) => i.parentCodigo === item.codigo);
    if (tieneHijos) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Este ítem tiene sub-ítems debajo. Elimínalos o reubícalos primero.',
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loader = true;
      this.cdr.detectChanges();
      this.plantillaCronogramaService.eliminarItem(item.id).subscribe({
        next: () => {
          this.loader = false;
          this.loadPlantillaItems();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
    });
  }

  loadProyectos(page: number = 1): void {
    this.proyectosLoading = true;
    this.cdr.detectChanges();

    this.proyectoService
      .getPaged({ page, ruc: '', razonSocial: '', projectDescription: '' })
      .subscribe({
        next: (response) => {
          this.proyectos = response;
          this.proyectosCurrentPage = response.page;
          this.proyectosTotalPages = response.totalPages;
          this.proyectosTotalRecords = response.totalRecords;
          this.proyectosLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.proyectosLoading = false;
          this.error(err);
        },
      });
  }

  toggleProyectoActive(item: ProjectDto): void {
    if (this.togglingProjectId != null) return;

    const anterior = item.active;
    const nuevoEstado = !anterior;
    const dto: ProjectEditDto = { ...item, active: nuevoEstado };

    // Optimista, mismo motivo que toggleProyectoUdp: [checked]="item.active" es
    // unidireccional y no repinta el DOM si el modelo nunca cambia de valor ante
    // un fallo del PUT. Guardamos "anterior" para poder revertir de verdad.
    item.active = nuevoEstado;
    this.togglingProjectId = item.projectId;

    this.proyectoService.edit(dto).subscribe({
      next: () => {
        this.togglingProjectId = null;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: nuevoEstado ? 'Proyecto activado' : 'Proyecto desactivado',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
        });
      },
      error: (err: HttpErrorResponse) => {
        item.active = anterior;
        this.togglingProjectId = null;
        this.cdr.detectChanges();
        this.error(err);
      },
    });
  }

  /** Solo filtra lo ya cargado — no re-pagina contra backend (no hay parámetro de filtro por UDP hoy). */
  get proyectosVisibles(): ProjectDto[] {
    if (!this.soloSinUdp) return this.proyectos.data;
    return this.proyectos.data.filter((p) => !p.tieneUnidadDeProyectos);
  }

  toggleProyectoUdp(item: ProjectDto): void {
    if (this.togglingUdpProjectId != null) return;

    // Optimista: el click nativo ya cambió el checkbox en el DOM. Si no tocamos el
    // modelo, `[checked]="item.tieneUnidadDeProyectos"` nunca ve un valor distinto
    // y Angular no vuelve a escribir el DOM cuando falla — el checkbox queda marcado
    // aunque el backend haya rechazado el cambio. Guardamos el valor previo para
    // poder revertir de verdad (un cambio real de valor) si el PATCH falla.
    const anterior = item.tieneUnidadDeProyectos ?? false;
    const nuevoValor = !anterior;
    item.tieneUnidadDeProyectos = nuevoValor;
    this.togglingUdpProjectId = item.projectId;

    this.proyectoService.toggleUnidadDeProyectos(item.projectId, nuevoValor).subscribe({
      next: (res) => {
        item.tieneUnidadDeProyectos = res.tieneUnidadDeProyectos;
        this.togglingUdpProjectId = null;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: res.tieneUnidadDeProyectos ? 'Proyecto asignado a UDP' : 'Proyecto desasignado de UDP',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
        });
      },
      error: (err: HttpErrorResponse) => {
        item.tieneUnidadDeProyectos = anterior;
        this.togglingUdpProjectId = null;
        this.cdr.detectChanges();
        this.error(err);
      },
    });
  }

  prevProyectosPage(): void {
    if (this.proyectosCurrentPage > 1) {
      this.loadProyectos(this.proyectosCurrentPage - 1);
    }
  }

  nextProyectosPage(): void {
    if (this.proyectosCurrentPage < this.proyectosTotalPages) {
      this.loadProyectos(this.proyectosCurrentPage + 1);
    }
  }

  goToProyectosPage(page: number): void {
    if (page >= 1 && page <= this.proyectosTotalPages) {
      this.loadProyectos(page);
    }
  }

  get proyectosPages(): number[] {
    return this.computePages(this.proyectosCurrentPage, this.proyectosTotalPages);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(milestone: MilestoneGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.milestoneId = milestone.milestoneId;
    this.editDto.milestoneDescription = milestone.milestoneDescription;
    this.editDto.active = milestone.active;
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
    }
  }

  loadMilestones() {
    this.loader = true;
    this.cdr.detectChanges();

    this.milestoneService.getAllMilestone().subscribe({
      next: (data) => {
        this.milestones = data;
        this.totalRecords = data.length;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  private computePages(currentPage: number, totalPages: number): number[] {
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = currentPage - Math.floor(maxButtons / 2);
    let end = currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  saveMilestone() {
    if (!this.createDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.createMilestone(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  editMilestone(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.editMilestone(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { milestoneId: 0, milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito actualizado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  deleteMilestone(milestoneId: number, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loader = true;
        this.milestoneService.deleteMilestone(milestoneId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadMilestones();
            this.loader = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
      }
    });
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
