import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { EppService } from '../../epp.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  EppCategoriaDto,
  EppFamiliaDto,
  EppItemDetalleDto,
  EppItemListDto,
  EppItemUpsertDto,
  EppModeloDto,
  EppModeloUpsertDto,
  EppPedidoListDto,
} from '../../epp.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';

interface ProyectoSimple {
  id: number;
  nombre: string;
}

interface EppFamiliaGrupo {
  familiaId: number;
  familiaNombre: string;
  items: EppItemListDto[];
}

interface EppCategoriaGrupo {
  categoriaId: number;
  categoriaNombre: string;
  familias: EppFamiliaGrupo[];
  totalItems: number;
}

const CATEGORIA_META: Record<string, { icon: string; color: string }> = {
  'Cabeza': { icon: 'ti-helmet', color: '#f59e0b' },
  'Ojos y Rostro': { icon: 'ti-eye', color: '#8b5cf6' },
  'Auditiva': { icon: 'ti-ear', color: '#ec4899' },
  'Manos': { icon: 'ti-hand-stop', color: '#10b981' },
  'Pies': { icon: 'ti-shoe', color: '#0ea5e9' },
  'Cuerpo': { icon: 'ti-shirt', color: '#6366f1' },
  'Altura': { icon: 'ti-arrow-bar-to-up', color: '#ef4444' },
  'Respiratoria': { icon: 'ti-lungs', color: '#14b8a6' },
};
const CATEGORIA_META_DEFAULT = { icon: 'ti-shield-check', color: '#005D9D' };

interface PedidoLinea {
  itemId: number;
  modeloId: number | null;
  categoriaNombre: string;
  familiaNombre: string;
  nombreTecnico: string;
  nombreComercial: string;
  marca: string;
  modelo: string;
  talla: string;
  cantidad: number;
}

@Component({
  selector: 'app-epp-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './epp-lista.html',
  styleUrl: './epp-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EppListaComponent implements OnInit {
  private svc = inject(EppService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);
  private sanitizer = inject(DomSanitizer);

  items: EppItemListDto[] = [];
  categorias: EppCategoriaDto[] = [];
  familias: EppFamiliaDto[] = [];
  proyectos: ProyectoSimple[] = [];
  loading = false;

  tab: 'catalogo' | 'pedido' = 'catalogo';

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Catálogo', icono: 'ti-list-tree', active: this.tab === 'catalogo' },
      { label: 'Generar Pedido', icono: 'ti-clipboard-list', active: this.tab === 'pedido' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    this.tab = t.label === 'Catálogo' ? 'catalogo' : 'pedido';
    this.cdr.markForCheck();
  }

  searchText = '';
  filtroCategoriaId: number | null = null;
  filtroFamiliaId: number | null = null;
  mostrarInactivos = false;

  expandedCategorias = new Set<number>();

  vista: 'tabla' | 'tarjetas' = 'tabla';

  cambiarVista(v: 'tabla' | 'tarjetas'): void {
    this.vista = v;
    this.cdr.markForCheck();
  }

  // Filas a pintar para un ítem: una por modelo/marca (Logística necesita verlas
  // separadas, no agrupadas en un contador), o una sola fila "vacía" si el ítem
  // todavía no tiene ningún modelo cargado. +1 si está en modo "agregar" inline.
  filasDeItem(item: EppItemListDto): (EppModeloDto | null)[] {
    return item.modelos.length > 0 ? item.modelos : [null];
  }

  totalFilasDeItem(item: EppItemListDto): number {
    return this.filasDeItem(item).length + (this.agregandoModeloParaItemId === item.id ? 1 : 0);
  }

  // ── Agregar/duplicar modelo directo desde la tabla, sin abrir el modal ───
  agregandoModeloParaItemId: number | null = null;
  nuevoModeloInlineForm: EppModeloUpsertDto = { marca: '', modelo: '', codigoReferencia: '' };
  guardandoModeloInline = false;

  iniciarAgregarModeloInline(item: EppItemListDto, base: EppModeloDto | null, event: Event): void {
    event.stopPropagation();
    this.agregandoModeloParaItemId = item.id;
    this.nuevoModeloInlineForm = base
      ? { marca: base.marca, modelo: base.modelo, codigoReferencia: base.codigoReferencia ?? '' }
      : { marca: '', modelo: '', codigoReferencia: '' };
    this.cdr.markForCheck();
  }

  cancelarAgregarModeloInline(event?: Event): void {
    event?.stopPropagation();
    this.agregandoModeloParaItemId = null;
    this.cdr.markForCheck();
  }

  get canGuardarModeloInline(): boolean {
    return !!(this.nuevoModeloInlineForm.marca.trim() && this.nuevoModeloInlineForm.modelo.trim() && !this.guardandoModeloInline);
  }

  guardarModeloInline(itemId: number, event: Event): void {
    event.stopPropagation();
    if (!this.canGuardarModeloInline) return;
    this.guardandoModeloInline = true;
    this.cdr.markForCheck();
    this.svc.createModelo(itemId, this.nuevoModeloInlineForm).subscribe({
      next: () => {
        this.guardandoModeloInline = false;
        this.agregandoModeloParaItemId = null;
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoModeloInline = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Zoom de imagen ───────────────────────────────────────────────────────
  imagenZoom: string | null = null;

  abrirZoomImagen(url: string | null | undefined, event: Event): void {
    event.stopPropagation();
    if (!url) return;
    this.imagenZoom = url;
    this.cdr.markForCheck();
  }

  cerrarZoomImagen(): void {
    this.imagenZoom = null;
    this.cdr.markForCheck();
  }

  // ── Visor inline de ficha técnica (PDF) ──────────────────────────────────
  fichaTecnicaModalUrl: SafeResourceUrl | null = null;
  fichaTecnicaModalUrlDescarga = '';
  fichaTecnicaModalNombre = '';

  abrirFichaTecnica(url: string | null | undefined, nombre: string | null | undefined, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!url) return;
    this.fichaTecnicaModalUrlDescarga = url;
    this.fichaTecnicaModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.fichaTecnicaModalNombre = nombre || 'Ficha técnica.pdf';
    this.cdr.markForCheck();
  }

  cerrarFichaTecnicaModal(): void {
    this.fichaTecnicaModalUrl = null;
    this.cdr.markForCheck();
  }

  get familiasFiltradasPorCategoria(): EppFamiliaDto[] {
    return this.filtroCategoriaId
      ? this.familias.filter((f) => f.categoriaId === this.filtroCategoriaId)
      : this.familias;
  }

  get familiasParaForm(): EppFamiliaDto[] {
    return this.familias.filter((f) => f.activo);
  }

  get itemsFiltrados(): EppItemListDto[] {
    return this.items.filter((i) => {
      if (!this.mostrarInactivos && !i.activo) return false;
      if (this.filtroCategoriaId && i.categoriaId !== this.filtroCategoriaId) return false;
      if (this.filtroFamiliaId && i.familiaId !== this.filtroFamiliaId) return false;
      if (this.searchText.trim() && !SearchInput.matches(`${i.nombreTecnico} ${i.nombreComercial} ${i.familiaNombre}`, this.searchText)) {
        return false;
      }
      return true;
    });
  }

  private agruparItems(items: EppItemListDto[]): EppCategoriaGrupo[] {
    const porCategoria = new Map<number, EppCategoriaGrupo>();

    for (const item of items) {
      let grupoCategoria = porCategoria.get(item.categoriaId);
      if (!grupoCategoria) {
        grupoCategoria = { categoriaId: item.categoriaId, categoriaNombre: item.categoriaNombre, familias: [], totalItems: 0 };
        porCategoria.set(item.categoriaId, grupoCategoria);
      }
      grupoCategoria.totalItems++;

      let grupoFamilia = grupoCategoria.familias.find((f) => f.familiaId === item.familiaId);
      if (!grupoFamilia) {
        grupoFamilia = { familiaId: item.familiaId, familiaNombre: item.familiaNombre, items: [] };
        grupoCategoria.familias.push(grupoFamilia);
      }
      grupoFamilia.items.push(item);
    }

    const grupos = Array.from(porCategoria.values());
    grupos.sort((a, b) => a.categoriaNombre.localeCompare(b.categoriaNombre));
    for (const g of grupos) {
      g.familias.sort((a, b) => a.familiaNombre.localeCompare(b.familiaNombre));
      for (const f of g.familias) {
        f.items.sort((a, b) => a.nombreTecnico.localeCompare(b.nombreTecnico));
      }
    }
    return grupos;
  }

  get gruposFiltrados(): EppCategoriaGrupo[] {
    return this.agruparItems(this.itemsFiltrados);
  }

  // Para "Generar Pedido": solo ítems activos/aprobados, sin importar el checkbox
  // "Mostrar inactivos" del Catálogo — un pedido nunca debe jalar algo dado de baja.
  get gruposPedido(): EppCategoriaGrupo[] {
    return this.agruparItems(this.itemsFiltrados.filter((i) => i.activo));
  }

  categoriaMeta(nombre: string): { icon: string; color: string } {
    return CATEGORIA_META[nombre] ?? CATEGORIA_META_DEFAULT;
  }

  isCategoriaExpandida(categoriaId: number): boolean {
    // Con búsqueda o filtro activo, se muestran expandidas para no esconder resultados.
    return this.expandedCategorias.has(categoriaId) || !!this.searchText.trim() || !!this.filtroFamiliaId;
  }

  toggleCategoriaExpandida(categoriaId: number): void {
    if (this.expandedCategorias.has(categoriaId)) {
      this.expandedCategorias.delete(categoriaId);
    } else {
      this.expandedCategorias.add(categoriaId);
    }
    this.cdr.markForCheck();
  }

  expandirTodo(): void {
    this.expandedCategorias = new Set(this.gruposFiltrados.map((g) => g.categoriaId));
    this.cdr.markForCheck();
  }

  colapsarTodo(): void {
    this.expandedCategorias = new Set();
    this.cdr.markForCheck();
  }

  onFilterChange(): void {
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.filtroCategoriaId = null;
    this.filtroFamiliaId = null;
    this.mostrarInactivos = false;
    this.onFilterChange();
  }

  onFiltroCategoriaChange(): void {
    this.filtroFamiliaId = null;
    this.onFilterChange();
  }

  get filtrosActivos(): boolean {
    return !!this.searchText.trim() || !!this.filtroCategoriaId || !!this.filtroFamiliaId || this.mostrarInactivos;
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.svc.getItems().subscribe({
      next: (res) => {
        this.items = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
    this.svc.getCategorias().subscribe({
      next: (res) => {
        this.categorias = res;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.svc.getFamilias().subscribe({
      next: (res) => {
        this.familias = res;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Crear / Editar ítem ──────────────────────────────────────────────────
  showFormModal = false;
  editando: EppItemDetalleDto | null = null;
  saving = false;
  form: EppItemUpsertDto = this.formVacio();
  subiendoImagen = false;

  private formVacio(): EppItemUpsertDto {
    return { nombreTecnico: '', nombreComercial: '', familiaId: 0, descripcion: '' };
  }

  abrirNuevo(): void {
    this.editando = null;
    this.form = this.formVacio();
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  abrirEditar(i: EppItemListDto): void {
    this.svc.getItemDetalle(i.id).subscribe({
      next: (detalle) => {
        this.editando = detalle;
        this.form = {
          nombreTecnico: detalle.nombreTecnico,
          nombreComercial: detalle.nombreComercial,
          familiaId: detalle.familiaId,
          descripcion: detalle.descripcion ?? '',
        };
        this.showFormModal = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  cerrarFormModal(): void {
    this.showFormModal = false;
    this.editando = null;
    this.cdr.markForCheck();
  }

  get canSubmitForm(): boolean {
    return !!(this.form.nombreTecnico.trim() && this.form.nombreComercial.trim() && this.form.familiaId && !this.saving);
  }

  guardarItem(): void {
    if (!this.canSubmitForm) return;
    this.saving = true;
    this.cdr.markForCheck();

    const obs: Observable<unknown> = this.editando
      ? this.svc.updateItem(this.editando.id, this.form)
      : this.svc.createItem(this.form);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showFormModal = false;
        this.editando = null;
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onImagenItemSeleccionada(event: Event): void {
    if (!this.editando) return;
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.subiendoImagen = true;
    this.cdr.markForCheck();
    this.svc.subirImagenItem(this.editando.id, archivo).subscribe({
      next: (res) => {
        this.editando = this.editando ? { ...this.editando, imagenUrl: res.imagenUrl } : null;
        this.subiendoImagen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagen = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  subiendoFicha = false;

  onFichaTecnicaSeleccionada(event: Event): void {
    if (!this.editando) return;
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (archivo.type !== 'application/pdf') {
      Swal.fire({ icon: 'error', title: 'La ficha técnica debe ser un PDF.' });
      input.value = '';
      return;
    }

    this.subiendoFicha = true;
    this.cdr.markForCheck();
    this.svc.subirFichaTecnica(this.editando.id, archivo).subscribe({
      next: (res) => {
        this.editando = this.editando
          ? { ...this.editando, fichaTecnicaUrl: res.fichaTecnicaUrl, fichaTecnicaNombreArchivo: archivo.name }
          : null;
        this.subiendoFicha = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoFicha = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  quitarFichaTecnica(): void {
    if (!this.editando) return;
    const itemId = this.editando.id;
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar la ficha técnica?',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.quitarFichaTecnica(itemId).subscribe({
        next: () => {
          this.editando = this.editando ? { ...this.editando, fichaTecnicaUrl: null, fichaTecnicaNombreArchivo: null } : null;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  toggleItemActivo(i: EppItemListDto): void {
    const nuevoEstado = !i.activo;
    Swal.fire({
      icon: 'warning',
      title: nuevoEstado ? '¿Activar este ítem?' : '¿Desactivar este ítem?',
      text: i.nombreTecnico,
      showCancelButton: true,
      confirmButtonText: nuevoEstado ? 'Activar' : 'Desactivar',
      confirmButtonColor: nuevoEstado ? undefined : '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.setItemActivo(i.id, nuevoEstado).subscribe({
        next: () => this.cargarTodo(),
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  // ── Modelos / marcas (dentro del ítem en edición) ────────────────────────
  nuevoModeloForm: EppModeloUpsertDto = { marca: '', modelo: '', codigoReferencia: '' };
  agregandoModelo = false;

  get canAgregarModelo(): boolean {
    return !!(this.nuevoModeloForm.marca.trim() && this.nuevoModeloForm.modelo.trim() && !this.agregandoModelo);
  }

  agregarModelo(): void {
    if (!this.editando || !this.canAgregarModelo) return;
    this.agregandoModelo = true;
    this.cdr.markForCheck();
    this.svc.createModelo(this.editando.id, this.nuevoModeloForm).subscribe({
      next: (detalle) => {
        this.editando = detalle;
        this.nuevoModeloForm = { marca: '', modelo: '', codigoReferencia: '' };
        this.agregandoModelo = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.agregandoModelo = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // Edición inline de un modelo/marca ya creado.
  editandoModeloId: number | null = null;
  editModeloForm: EppModeloUpsertDto = { marca: '', modelo: '', codigoReferencia: '' };
  guardandoModelo = false;

  abrirEditarModelo(m: EppModeloDto): void {
    this.editandoModeloId = m.id;
    this.editModeloForm = { marca: m.marca, modelo: m.modelo, codigoReferencia: m.codigoReferencia ?? '' };
    this.cdr.markForCheck();
  }

  cancelarEditarModelo(): void {
    this.editandoModeloId = null;
    this.cdr.markForCheck();
  }

  get canGuardarEditarModelo(): boolean {
    return !!(this.editModeloForm.marca.trim() && this.editModeloForm.modelo.trim() && !this.guardandoModelo);
  }

  guardarEditarModelo(): void {
    if (!this.editando || !this.editandoModeloId || !this.canGuardarEditarModelo) return;
    const itemId = this.editando.id;
    this.guardandoModelo = true;
    this.cdr.markForCheck();
    this.svc.updateModelo(this.editandoModeloId, this.editModeloForm).subscribe({
      next: () => {
        this.guardandoModelo = false;
        this.editandoModeloId = null;
        this.svc.getItemDetalle(itemId).subscribe({
          next: (detalle) => {
            this.editando = detalle;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoModelo = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleModeloActivo(m: EppModeloDto): void {
    if (!this.editando) return;
    const itemId = this.editando.id;
    this.svc.setModeloActivo(m.id, !m.activo).subscribe({
      next: () => {
        this.svc.getItemDetalle(itemId).subscribe({
          next: (detalle) => {
            this.editando = detalle;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  onImagenModeloSeleccionada(event: Event, modeloId: number): void {
    if (!this.editando) return;
    const itemId = this.editando.id;
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.svc.subirImagenModelo(modeloId, archivo).subscribe({
      next: () => {
        this.svc.getItemDetalle(itemId).subscribe({
          next: (detalle) => {
            this.editando = detalle;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // ── Categorías y Familias (gestión rápida desde el mismo listado) ────────
  showCategoriasModal = false;
  nuevaCategoriaForm = { nombre: '', orden: 0 };
  nuevaFamiliaForm: { nombre: string; categoriaId: number; orden: number } = { nombre: '', categoriaId: 0, orden: 0 };

  abrirCategorias(): void {
    this.showCategoriasModal = true;
    this.cdr.markForCheck();
  }

  cerrarCategorias(): void {
    this.showCategoriasModal = false;
    this.cdr.markForCheck();
  }

  crearCategoria(): void {
    if (!this.nuevaCategoriaForm.nombre.trim()) return;
    this.svc.createCategoria(this.nuevaCategoriaForm).subscribe({
      next: () => {
        this.nuevaCategoriaForm = { nombre: '', orden: 0 };
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // Edición inline: nombre y orden de una categoría ya creada.
  editandoCategoriaId: number | null = null;
  editCategoriaForm = { nombre: '', orden: 0 };

  abrirEditarCategoria(c: EppCategoriaDto): void {
    this.editandoCategoriaId = c.id;
    this.editCategoriaForm = { nombre: c.nombre, orden: c.orden };
    this.cdr.markForCheck();
  }

  cancelarEditarCategoria(): void {
    this.editandoCategoriaId = null;
    this.cdr.markForCheck();
  }

  guardarEditarCategoria(): void {
    if (!this.editandoCategoriaId || !this.editCategoriaForm.nombre.trim()) return;
    this.svc.updateCategoria(this.editandoCategoriaId, this.editCategoriaForm).subscribe({
      next: () => {
        this.editandoCategoriaId = null;
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  toggleCategoriaActivo(c: EppCategoriaDto): void {
    this.svc.setCategoriaActivo(c.id, !c.activo).subscribe({
      next: () => this.cargarTodo(),
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // Solo se puede borrar una categoría sin familias — típicamente las que se crearon
  // de prueba o con el nombre equivocado y nunca se usaron.
  eliminarCategoria(c: EppCategoriaDto): void {
    Swal.fire({
      icon: 'warning',
      title: `¿Eliminar la categoría "${c.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deleteCategoria(c.id).subscribe({
        next: () => this.cargarTodo(),
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  familiasDeCategoria(categoriaId: number): EppFamiliaDto[] {
    return this.familias.filter((f) => f.categoriaId === categoriaId);
  }

  get canCrearFamilia(): boolean {
    return !!(this.nuevaFamiliaForm.nombre.trim() && this.nuevaFamiliaForm.categoriaId);
  }

  crearFamilia(): void {
    if (!this.canCrearFamilia) return;
    this.svc.createFamilia(this.nuevaFamiliaForm).subscribe({
      next: () => {
        this.nuevaFamiliaForm = { nombre: '', categoriaId: 0, orden: 0 };
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // Edición inline: nombre, orden y categoría de una familia ya creada.
  editandoFamiliaId: number | null = null;
  editFamiliaForm: { nombre: string; categoriaId: number; orden: number } = { nombre: '', categoriaId: 0, orden: 0 };

  abrirEditarFamilia(f: EppFamiliaDto): void {
    this.editandoFamiliaId = f.id;
    this.editFamiliaForm = { nombre: f.nombre, categoriaId: f.categoriaId, orden: f.orden };
    this.cdr.markForCheck();
  }

  cancelarEditarFamilia(): void {
    this.editandoFamiliaId = null;
    this.cdr.markForCheck();
  }

  get canGuardarEditarFamilia(): boolean {
    return !!(this.editFamiliaForm.nombre.trim() && this.editFamiliaForm.categoriaId);
  }

  guardarEditarFamilia(): void {
    if (!this.editandoFamiliaId || !this.canGuardarEditarFamilia) return;
    this.svc.updateFamilia(this.editandoFamiliaId, this.editFamiliaForm).subscribe({
      next: () => {
        this.editandoFamiliaId = null;
        this.cargarTodo();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  toggleFamiliaActivo(f: EppFamiliaDto): void {
    this.svc.setFamiliaActivo(f.id, !f.activo).subscribe({
      next: () => this.cargarTodo(),
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  // Solo se puede borrar una familia sin ítems — típicamente las que se crearon de
  // prueba o mal (ej. una por cada variante en vez de agruparlas).
  eliminarFamilia(f: EppFamiliaDto): void {
    Swal.fire({
      icon: 'warning',
      title: `¿Eliminar la familia "${f.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deleteFamilia(f.id).subscribe({
        next: () => this.cargarTodo(),
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GENERAR PEDIDO — solo ítems activos/aprobados del catálogo, con
  // talla y cantidad por línea, exportable a Excel para Logística.
  // ─────────────────────────────────────────────────────────────────

  // Draft de talla/cantidad por fila (marca-modelo) antes de agregarla al pedido.
  private pedidoDraftKey(itemId: number, modeloId: number | null): string {
    return `${itemId}-${modeloId ?? 0}`;
  }

  pedidoDrafts = new Map<string, { talla: string; cantidad: number | null }>();

  pedidoDraft(item: EppItemListDto, modelo: EppModeloDto | null): { talla: string; cantidad: number | null } {
    const key = this.pedidoDraftKey(item.id, modelo?.id ?? null);
    let draft = this.pedidoDrafts.get(key);
    if (!draft) {
      draft = { talla: '', cantidad: null };
      this.pedidoDrafts.set(key, draft);
    }
    return draft;
  }

  puedeAgregarAlPedido(item: EppItemListDto, modelo: EppModeloDto | null): boolean {
    const draft = this.pedidoDraft(item, modelo);
    return !!draft.cantidad && draft.cantidad > 0;
  }

  agregarLineaPedido(item: EppItemListDto, modelo: EppModeloDto | null, event: Event): void {
    event.stopPropagation();
    const draft = this.pedidoDraft(item, modelo);
    if (!draft.cantidad || draft.cantidad <= 0) return;

    this.pedidoLineas = [
      ...this.pedidoLineas,
      {
        itemId: item.id,
        modeloId: modelo?.id ?? null,
        categoriaNombre: item.categoriaNombre,
        familiaNombre: item.familiaNombre,
        nombreTecnico: item.nombreTecnico,
        nombreComercial: item.nombreComercial,
        marca: modelo?.marca ?? '',
        modelo: modelo?.modelo ?? '',
        talla: draft.talla.trim(),
        cantidad: draft.cantidad,
      },
    ];
    this.pedidoDrafts.delete(this.pedidoDraftKey(item.id, modelo?.id ?? null));
    this.cdr.markForCheck();
  }

  // ── Pedido en construcción ───────────────────────────────────────────────
  pedidoLineas: PedidoLinea[] = [];

  quitarLineaPedido(index: number): void {
    this.pedidoLineas = this.pedidoLineas.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  vaciarPedido(): void {
    if (this.pedidoLineas.length === 0) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Vaciar el pedido en construcción?',
      showCancelButton: true,
      confirmButtonText: 'Vaciar',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.pedidoLineas = [];
      this.cdr.markForCheck();
    });
  }

  get totalUnidadesPedido(): number {
    return this.pedidoLineas.reduce((sum, l) => sum + l.cantidad, 0);
  }

  private exportarExcel(codigo: string, proyectoNombre: string, fecha: string, lineas: PedidoLinea[]): void {
    const filas = lineas.map((l) => ({
      Categoría: l.categoriaNombre,
      Familia: l.familiaNombre,
      'Nombre técnico': l.nombreTecnico,
      'Nombre comercial': l.nombreComercial,
      Marca: l.marca || '—',
      Modelo: l.modelo || '—',
      Talla: l.talla || '—',
      Cantidad: l.cantidad,
    }));

    const ws = XLSX.utils.aoa_to_sheet([
      [`Pedido de EPP — ${codigo}`],
      [`Proyecto: ${proyectoNombre}   ·   Fecha: ${fecha}`],
      [],
    ]);
    XLSX.utils.sheet_add_json(ws, filas, { origin: 'A4' });
    ws['!cols'] = [
      { wch: 16 }, { wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido EPP');
    XLSX.writeFile(wb, `${codigo}.xlsx`);
  }

  // ── Guardar el pedido (código correlativo, proyecto, fecha, generador) ───
  showGuardarPedidoModal = false;
  guardarPedidoProjectId: number | null = null;
  guardarPedidoObservaciones = '';
  guardandoPedido = false;

  abrirGuardarPedido(): void {
    if (this.pedidoLineas.length === 0) return;
    this.guardarPedidoProjectId = null;
    this.guardarPedidoObservaciones = '';
    this.showGuardarPedidoModal = true;
    this.cdr.markForCheck();
  }

  cerrarGuardarPedido(): void {
    this.showGuardarPedidoModal = false;
    this.cdr.markForCheck();
  }

  get canGuardarPedido(): boolean {
    return !!(this.guardarPedidoProjectId && this.pedidoLineas.length > 0 && !this.guardandoPedido);
  }

  confirmarGuardarPedido(): void {
    if (!this.canGuardarPedido || !this.guardarPedidoProjectId) return;
    this.guardandoPedido = true;
    this.cdr.markForCheck();

    this.svc
      .createPedido({
        projectId: this.guardarPedidoProjectId,
        observaciones: this.guardarPedidoObservaciones.trim() || undefined,
        lineas: this.pedidoLineas.map((l) => ({
          eppItemId: l.itemId,
          eppModeloId: l.modeloId,
          nombreTecnico: l.nombreTecnico,
          nombreComercial: l.nombreComercial,
          marca: l.marca || null,
          modelo: l.modelo || null,
          talla: l.talla || null,
          cantidad: l.cantidad,
        })),
      })
      .subscribe({
        next: (pedido) => {
          this.guardandoPedido = false;
          this.showGuardarPedidoModal = false;
          this.exportarExcel(
            pedido.codigo,
            pedido.projectDescription,
            new Date(pedido.fecha).toLocaleDateString('es-PE'),
            this.pedidoLineas,
          );
          Swal.fire({
            icon: 'success',
            title: `Pedido ${pedido.codigo} guardado`,
            text: 'Se descargó el Excel y quedó en el historial.',
            timer: 2500,
            showConfirmButton: false,
          });
          this.pedidoLineas = [];
          this.cargarPedidos();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoPedido = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── Historial de pedidos ─────────────────────────────────────────────────
  showHistorialModal = false;
  pedidosHistorial: EppPedidoListDto[] = [];
  cargandoHistorial = false;

  abrirHistorial(): void {
    this.showHistorialModal = true;
    this.cargarPedidos();
    this.cdr.markForCheck();
  }

  cerrarHistorial(): void {
    this.showHistorialModal = false;
    this.cdr.markForCheck();
  }

  private cargarPedidos(): void {
    this.cargandoHistorial = true;
    this.cdr.markForCheck();
    this.svc.getPedidos().subscribe({
      next: (res) => {
        this.pedidosHistorial = res;
        this.cargandoHistorial = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoHistorial = false;
        this.cdr.markForCheck();
      },
    });
  }

  reexportarPedido(p: EppPedidoListDto): void {
    this.svc.getPedidoDetalle(p.id).subscribe({
      next: (detalle) => {
        const lineas: PedidoLinea[] = detalle.lineas.map((l) => ({
          itemId: 0,
          modeloId: null,
          categoriaNombre: '',
          familiaNombre: '',
          nombreTecnico: l.nombreTecnico,
          nombreComercial: l.nombreComercial,
          marca: l.marca ?? '',
          modelo: l.modelo ?? '',
          talla: l.talla ?? '',
          cantidad: l.cantidad,
        }));
        this.exportarExcel(detalle.codigo, detalle.projectDescription, new Date(detalle.fecha).toLocaleDateString('es-PE'), lineas);
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }
}
