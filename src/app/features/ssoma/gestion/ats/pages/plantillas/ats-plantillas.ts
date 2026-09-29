import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { ATS_HEADER_TABS } from '../../shared/ats-header-tabs';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { AtsService } from '../../services/ats.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  AtsInitDto,
  AtsPlantillaDto,
  AtsPuestoDto,
  AtsPlantillaGuardarRequestDto,
  AtsPasoPuestoDto,
  AtsAutorizacionTrabajadorDto,
  AtsPeligroDto,
  AtsRiesgoConControlesDto,
  AtsPlantillaPuestoDto,
  TipoControl,
  TIPOS_CONTROL,
} from '../../dtos/ats.dtos';

@Component({
  selector: 'app-ats-plantillas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    SearchSelect,
    SearchInput,
    FilterTriggerButton,
    FilterModal,
    Paginator,
    SignaturePad,
  ],
  templateUrl: './ats-plantillas.html',
  styleUrl: './ats-plantillas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsPlantillas implements OnInit {
  tab: 'plantillas' | 'pasos' | 'autorizaciones' | 'riesgos' | 'controles' | 'plantillas-puesto' = 'plantillas';

  // ── Plantillas por puesto (autosugerencia) ──────────────────────────────
  plantillasPuesto: AtsPlantillaPuestoDto[] = [];
  loadingPlantillasPuesto = false;
  guardandoPlantillaPuestoId: number | null = null;

  // ── Controles sugeridos por riesgo ──────────────────────────────────────
  riesgosControles: AtsRiesgoConControlesDto[] = [];
  loadingControles = false;
  nuevoControlTexto: Record<number, string> = {};
  nuevoControlTipo: Record<number, TipoControl> = {};
  guardandoControlRiesgoId: number | null = null;
  readonly tiposControl = TIPOS_CONTROL;

  tipoControlDe(riesgoId: number): TipoControl {
    return this.nuevoControlTipo[riesgoId] ?? 'Administrativo';
  }

  setTipoControlDe(riesgoId: number, tipo: TipoControl): void {
    this.nuevoControlTipo[riesgoId] = tipo;
  }

  tipoControlLabel(tipo: TipoControl): string {
    return TIPOS_CONTROL.find((t) => t.value === tipo)?.label ?? tipo;
  }

  peligrosCatalogo: AtsPeligroDto[] = [];
  loadingRiesgos = false;
  guardandoRiesgoId: number | null = null;

  trabajadoresAutorizacion: AtsAutorizacionTrabajadorDto[] = [];
  loadingAutorizaciones = false;
  subiendoWorkerId: number | null = null;

  firmaDigitalModalAbierto = false;
  firmaDigitalTrabajador: AtsAutorizacionTrabajadorDto | null = null;
  firmaDigitalHayTrazo = false;
  guardandoFirmaDigital = false;

  searchAutorizaciones = '';
  estadoAutorizacionFilter: 'todos' | 'ok' | 'falta' = 'todos';
  proyectoAutorizacionFilter: number | null = null;
  clasificacionAutorizacionFilter: string | null = null;
  filtrosAutorizacionesAbiertos = false;
  private readonly pagerAutorizaciones = new ClientPager<AtsAutorizacionTrabajadorDto>();

  loading = true;
  plantillas: AtsPlantillaDto[] = [];
  puestos: AtsPuestoDto[] = [];
  catalogo: AtsInitDto | null = null;

  pasosPuesto: AtsPasoPuestoDto[] = [];
  loadingPasos = false;
  guardandoPasoId: number | null = null;

  modalAbierto = false;
  guardando = false;
  editandoId: number | null = null;

  nombre = '';
  peligrosMarcados = new Set<number>();
  eppsMarcados = new Set<number>();
  herramientasMarcadas = new Set<number>();

  readonly headerTabs = ATS_HEADER_TABS;

  constructor(
    private svc: AtsService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Angular reutiliza esta MISMA instancia al navegar entre plantillas/pasos,
    // plantillas/autorizaciones y plantillas/riesgos (comparten el Route config
    // "plantillas/:tab", solo cambia el parámetro) — por eso hay que reaccionar
    // a cada cambio de parámetro, no leerlo una sola vez en el arranque.
    this.route.paramMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const tabsValidos = ['pasos', 'autorizaciones', 'riesgos', 'controles', 'plantillas-puesto'];
      this.tab = (tabsValidos.includes(tabParam ?? '') ? tabParam : 'plantillas') as typeof this.tab;
      if (this.tab === 'pasos' && this.pasosPuesto.length === 0) this.cargarPasosPuesto();
      if (this.tab === 'autorizaciones' && this.trabajadoresAutorizacion.length === 0) this.cargarAutorizaciones();
      if (this.tab === 'riesgos' && this.peligrosCatalogo.length === 0) this.cargarRiesgos();
      if (this.tab === 'controles' && this.riesgosControles.length === 0) this.cargarControles();
      if (this.tab === 'plantillas-puesto' && this.plantillasPuesto.length === 0) this.cargarPlantillasPuesto();
      this.cdr.markForCheck();
    });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getPuestos().subscribe({ next: (p) => { this.puestos = p; this.cdr.markForCheck(); }, error: () => {} });
    this.svc.getInit().subscribe({
      next: (init) => { this.catalogo = init; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.svc.getPlantillas().subscribe({
      next: (list) => { this.plantillas = list; this.loading = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  puestoNombre(id?: number): string {
    return this.puestos.find((p) => p.id === id)?.nombre ?? '—';
  }

  cargarRiesgos(): void {
    this.loadingRiesgos = true;
    this.svc.getPeligros().subscribe({
      next: (list) => { this.peligrosCatalogo = list; this.loadingRiesgos = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingRiesgos = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  toggleRequierePetar(riesgo: { id: number; requierePetar: boolean }): void {
    const nuevoValor = !riesgo.requierePetar;
    this.guardandoRiesgoId = riesgo.id;
    this.cdr.markForCheck();
    this.svc.setRiesgoRequierePetar(riesgo.id, nuevoValor).subscribe({
      next: () => { riesgo.requierePetar = nuevoValor; this.guardandoRiesgoId = null; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.guardandoRiesgoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  cargarAutorizaciones(): void {
    this.loadingAutorizaciones = true;
    this.svc.getTrabajadoresAutorizacion().subscribe({
      next: (list) => {
        this.trabajadoresAutorizacion = list;
        this.loadingAutorizaciones = false;
        this.pagerAutorizaciones.reset();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.loadingAutorizaciones = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get filtrosAutorizacionesActivos(): number {
    let n = 0;
    if (this.searchAutorizaciones.trim()) n++;
    if (this.estadoAutorizacionFilter !== 'todos') n++;
    if (this.proyectoAutorizacionFilter !== null) n++;
    if (this.clasificacionAutorizacionFilter !== null) n++;
    return n;
  }

  limpiarFiltrosAutorizaciones(): void {
    this.searchAutorizaciones = '';
    this.estadoAutorizacionFilter = 'todos';
    this.proyectoAutorizacionFilter = null;
    this.clasificacionAutorizacionFilter = null;
    this.onFiltroAutorizacionesChange();
  }

  onFiltroAutorizacionesChange(): void {
    this.pagerAutorizaciones.reset();
    this.cdr.markForCheck();
  }

  get proyectosAutorizacionOpts(): { id: number; nombre: string }[] {
    const map = new Map<number, string>();
    for (const t of this.trabajadoresAutorizacion) {
      if (t.proyectoId != null) map.set(t.proyectoId, t.proyectoNombre ?? `Proyecto ${t.proyectoId}`);
    }
    return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get clasificacionesAutorizacionOpts(): { value: string; label: string }[] {
    const set = new Set<string>();
    for (const t of this.trabajadoresAutorizacion) {
      if (t.obraOficinaStaff) set.add(t.obraOficinaStaff);
    }
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }

  get trabajadoresAutorizacionFiltrados(): AtsAutorizacionTrabajadorDto[] {
    return this.trabajadoresAutorizacion.filter((t) => {
      const query = this.searchAutorizaciones.trim();
      const matchesTexto = !query || SearchInput.matches(t.nombre, query) || (t.dni ?? '').includes(query);
      const matchesEstado =
        this.estadoAutorizacionFilter === 'todos' ||
        (this.estadoAutorizacionFilter === 'ok' && t.tieneAutorizacion) ||
        (this.estadoAutorizacionFilter === 'falta' && !t.tieneAutorizacion);
      const matchesProyecto = this.proyectoAutorizacionFilter === null || t.proyectoId === this.proyectoAutorizacionFilter;
      const matchesClasificacion = this.clasificacionAutorizacionFilter === null || t.obraOficinaStaff === this.clasificacionAutorizacionFilter;
      return matchesTexto && matchesEstado && matchesProyecto && matchesClasificacion;
    });
  }

  get autorizacionesCurrentPage(): number {
    return this.pagerAutorizaciones.currentPage;
  }

  get autorizacionesTotalPages(): number {
    return this.pagerAutorizaciones.totalPages(this.trabajadoresAutorizacionFiltrados);
  }

  get trabajadoresAutorizacionPagina(): AtsAutorizacionTrabajadorDto[] {
    return this.pagerAutorizaciones.page(this.trabajadoresAutorizacionFiltrados);
  }

  changeAutorizacionesPage(page: number): void {
    this.pagerAutorizaciones.goTo(page);
    this.cdr.markForCheck();
  }

  descargarPlantillaAutorizacion(t: AtsAutorizacionTrabajadorDto): void {
    this.svc.getPlantillaAutorizacionPdf(t.workerId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Autorizacion-ATS-${t.nombre}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  abrirFirmaDigital(t: AtsAutorizacionTrabajadorDto): void {
    this.firmaDigitalTrabajador = t;
    this.firmaDigitalHayTrazo = false;
    this.firmaDigitalModalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarFirmaDigital(): void {
    this.firmaDigitalModalAbierto = false;
    this.firmaDigitalTrabajador = null;
    this.cdr.markForCheck();
  }

  guardarFirmaDigital(dataUrl: string | null): void {
    if (!dataUrl || !this.firmaDigitalTrabajador || this.guardandoFirmaDigital) return;
    this.guardandoFirmaDigital = true;
    this.cdr.markForCheck();
    this.svc.firmarDigitalAutorizacion(this.firmaDigitalTrabajador.workerId, { firmaBase64: dataUrl }).subscribe({
      next: () => {
        this.guardandoFirmaDigital = false;
        this.firmaDigitalModalAbierto = false;
        this.firmaDigitalTrabajador = null;
        this.cargarAutorizaciones();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirmaDigital = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  subirAutorizacion(t: AtsAutorizacionTrabajadorDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.subiendoWorkerId = t.workerId;
    this.cdr.markForCheck();
    this.svc.subirAutorizacionPermiso(t.workerId, archivo).subscribe({
      next: () => {
        this.subiendoWorkerId = null;
        input.value = '';
        this.cargarAutorizaciones();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoWorkerId = null;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cargarPasosPuesto(): void {
    this.loadingPasos = true;
    this.svc.getPasoPuestoMapeo().subscribe({
      next: (list) => { this.pasosPuesto = list; this.loadingPasos = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingPasos = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get pasosPorCategoria(): { categoria: string; items: AtsPasoPuestoDto[] }[] {
    const grupos = new Map<string, AtsPasoPuestoDto[]>();
    for (const p of this.pasosPuesto) {
      if (!grupos.has(p.categoriaNombre)) grupos.set(p.categoriaNombre, []);
      grupos.get(p.categoriaNombre)!.push(p);
    }
    return Array.from(grupos.entries()).map(([categoria, items]) => ({ categoria, items }));
  }

  puestosDisponiblesPara(paso: AtsPasoPuestoDto): { id: number; nombre: string }[] {
    return this.puestos.filter((p) => !paso.puestoIds.includes(p.id));
  }

  puestoNombresDe(paso: AtsPasoPuestoDto): { id: number; nombre: string }[] {
    return paso.puestoIds.map((id) => ({ id, nombre: this.puestoNombre(id) }));
  }

  private guardarMapeo(paso: AtsPasoPuestoDto): void {
    this.guardandoPasoId = paso.pasoId;
    this.cdr.markForCheck();
    this.svc.setPasoPuestos(paso.pasoId, paso.puestoIds).subscribe({
      next: () => { this.guardandoPasoId = null; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.guardandoPasoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  agregarPuesto(paso: AtsPasoPuestoDto, puestoId: number | null): void {
    if (!puestoId || paso.puestoIds.includes(puestoId)) return;
    paso.puestoIds.push(puestoId);
    this.guardarMapeo(paso);
  }

  quitarPuesto(paso: AtsPasoPuestoDto, puestoId: number): void {
    paso.puestoIds = paso.puestoIds.filter((id) => id !== puestoId);
    this.guardarMapeo(paso);
  }

  // ── Plantillas por puesto (autosugerencia) ──────────────────────────────

  cargarPlantillasPuesto(): void {
    this.loadingPlantillasPuesto = true;
    this.svc.getPlantillaPuestoMapeo().subscribe({
      next: (list) => { this.plantillasPuesto = list; this.loadingPlantillasPuesto = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingPlantillasPuesto = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  puestosDisponiblesParaPlantilla(pp: AtsPlantillaPuestoDto): { id: number; nombre: string }[] {
    return this.puestos.filter((p) => !pp.puestoIds.includes(p.id));
  }

  puestoNombresDePlantilla(pp: AtsPlantillaPuestoDto): { id: number; nombre: string }[] {
    return pp.puestoIds.map((id) => ({ id, nombre: this.puestoNombre(id) }));
  }

  private guardarMapeoPlantilla(pp: AtsPlantillaPuestoDto): void {
    this.guardandoPlantillaPuestoId = pp.plantillaId;
    this.cdr.markForCheck();
    this.svc.setPlantillaPuestos(pp.plantillaId, pp.puestoIds).subscribe({
      next: () => { this.guardandoPlantillaPuestoId = null; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.guardandoPlantillaPuestoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  agregarPuestoAPlantilla(pp: AtsPlantillaPuestoDto, puestoId: number | null): void {
    if (!puestoId || pp.puestoIds.includes(puestoId)) return;
    pp.puestoIds.push(puestoId);
    this.guardarMapeoPlantilla(pp);
  }

  quitarPuestoDePlantilla(pp: AtsPlantillaPuestoDto, puestoId: number): void {
    pp.puestoIds = pp.puestoIds.filter((id) => id !== puestoId);
    this.guardarMapeoPlantilla(pp);
  }

  nuevaPlantilla(): void {
    this.editandoId = null;
    this.nombre = '';
    this.peligrosMarcados = new Set();
    this.eppsMarcados = new Set();
    this.herramientasMarcadas = new Set();
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.cdr.markForCheck();
  }

  peligroMarcado(id: number): boolean { return this.peligrosMarcados.has(id); }
  togglePeligro(id: number): void { this.peligrosMarcados.has(id) ? this.peligrosMarcados.delete(id) : this.peligrosMarcados.add(id); }

  eppMarcado(id: number): boolean { return this.eppsMarcados.has(id); }
  toggleEpp(id: number): void { this.eppsMarcados.has(id) ? this.eppsMarcados.delete(id) : this.eppsMarcados.add(id); }

  herramientaMarcada(id: number): boolean { return this.herramientasMarcadas.has(id); }
  toggleHerramienta(id: number): void { this.herramientasMarcadas.has(id) ? this.herramientasMarcadas.delete(id) : this.herramientasMarcadas.add(id); }

  get puedeGuardar(): boolean {
    return !!this.nombre.trim() && !this.guardando;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.guardando = true;
    this.cdr.markForCheck();

    const dto: AtsPlantillaGuardarRequestDto = {
      nombre: this.nombre.trim(),
      peligroIds: Array.from(this.peligrosMarcados),
      eppIds: Array.from(this.eppsMarcados),
      herramientaIds: Array.from(this.herramientasMarcadas),
    };

    const alTerminar = () => {
      this.guardando = false;
      this.modalAbierto = false;
      this.cargar();
      this.cdr.markForCheck();
    };
    const alFallar = (err: HttpErrorResponse) => {
      this.guardando = false;
      this.errorService.handleError(err);
      this.cdr.markForCheck();
    };

    if (this.editandoId) {
      this.svc.editarPlantilla(this.editandoId, dto).subscribe({ next: alTerminar, error: alFallar });
    } else {
      this.svc.crearPlantilla(dto).subscribe({ next: alTerminar, error: alFallar });
    }
  }

  // ── Controles sugeridos por riesgo ──────────────────────────────────────

  cargarControles(): void {
    this.loadingControles = true;
    this.svc.getRiesgosConControles().subscribe({
      next: (list) => { this.riesgosControles = list; this.loadingControles = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingControles = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get controlesPorPeligro(): { peligroNombre: string; riesgos: AtsRiesgoConControlesDto[] }[] {
    const grupos = new Map<string, AtsRiesgoConControlesDto[]>();
    for (const r of this.riesgosControles) {
      if (!grupos.has(r.peligroNombre)) grupos.set(r.peligroNombre, []);
      grupos.get(r.peligroNombre)!.push(r);
    }
    return Array.from(grupos.entries()).map(([peligroNombre, riesgos]) => ({ peligroNombre, riesgos }));
  }

  agregarControl(r: AtsRiesgoConControlesDto): void {
    const texto = (this.nuevoControlTexto[r.riesgoId] ?? '').trim();
    if (!texto || this.guardandoControlRiesgoId === r.riesgoId) return;
    const tipo = this.tipoControlDe(r.riesgoId);
    this.guardandoControlRiesgoId = r.riesgoId;
    this.cdr.markForCheck();
    this.svc.crearControl(r.riesgoId, { texto, tipo }).subscribe({
      next: (res) => {
        r.controles.push({ id: res.id, texto, tipo, orden: r.controles.length + 1 });
        this.nuevoControlTexto[r.riesgoId] = '';
        this.guardandoControlRiesgoId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.guardandoControlRiesgoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  eliminarControl(r: AtsRiesgoConControlesDto, controlId: number): void {
    this.svc.eliminarControl(controlId).subscribe({
      next: () => { r.controles = r.controles.filter((c) => c.id !== controlId); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  desactivar(p: AtsPlantillaDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar "${p.nombre}"?`,
      text: 'Dejará de sugerirse en el formulario de ATS. No afecta los ATS ya firmados con ella.',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.desactivarPlantilla(p.id).subscribe({
        next: () => this.cargar(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
