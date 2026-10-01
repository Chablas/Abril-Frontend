import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { ATS_HEADER_TABS } from '../../shared/ats-header-tabs';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { AtsService } from '../../services/ats.service';
import { AtsResponseDto, AtsFiltroDto, AtsProyectoDto, AtsGrupoListaItemDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { comprimirPisos } from '../../shared/ats-lugar';
import { AtsObservaciones } from '../observaciones/ats-observaciones';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { PetarService } from '../../../petar/services/petar.service';

type RolVisto = 'capataz' | 'autoriza' | 'ssoma' | 'petar-supervisor' | 'petar-ssoma';

@Component({
  selector: 'app-ats-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    SignaturePad,
    FabButton,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    Paginator,
    TitleCasePipe,
    AtsObservaciones,
  ],
  templateUrl: './ats-lista.html',
  styleUrl: './ats-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsLista implements OnInit {
  lista: AtsResponseDto[] = [];
  grupos: AtsGrupoListaItemDto[] = [];
  vista: 'individuales' | 'grupales' = 'individuales';

  /** Acciones en curso (PDF ver/descargar) — para mostrar spinner y bloquear el doble clic: sin esto
   *  el botón no daba ninguna señal de que el clic se registró mientras el servidor armaba el PDF. */
  private acciones = new Set<string>();
  ocupado(key: string): boolean { return this.acciones.has(key); }
  private iniciar(key: string): void { this.acciones.add(key); this.cdr.markForCheck(); }
  private terminar(key: string): void { this.acciones.delete(key); this.cdr.markForCheck(); }

  /** Menú "⋯" de acciones secundarias (Generar PETAR / Corregir / Duplicar) abierto en esta fila. */
  menuAbierto: number | null = null;
  toggleMenu(id: number, ev: Event): void {
    ev.stopPropagation();
    this.menuAbierto = this.menuAbierto === id ? null : id;
    this.cdr.markForCheck();
  }
  @HostListener('document:click')
  cerrarMenu(): void {
    if (this.menuAbierto === null) return;
    this.menuAbierto = null;
    this.cdr.markForCheck();
  }

  cambiarVista(v: 'individuales' | 'grupales'): void {
    if (this.vista === v) return;
    this.vista = v;
    this.page = 1;
    this.cargar();
  }

  loading = false;
  totalRecords = 0;
  totalPages = 0;
  page = 1;

  proyectos: AtsProyectoDto[] = [];
  filtroProyectoId: number | null = null;
  filtroEstado: string | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtrosAbiertos = false;
  soloPendientes = false;

  readonly estadoOpts = [
    { id: 'Borrador', label: 'Borrador' },
    { id: 'Firmado', label: 'Firmado' },
    { id: 'Anulado', label: 'Anulado' },
  ];

  // ── Firma de Autoriza / Visto Bueno SSOMA (y, generalizado, Supervisor/SSOMA de PETAR) ──────
  atsFirmandoVisto: AtsResponseDto | null = null;
  /** Presente solo cuando rolVisto es 'petar-supervisor'/'petar-ssoma' — a qué PETAR de la fila
   *  corresponde (un ATS puede tener más de uno). */
  petarFirmandoId: number | null = null;
  rolVisto: RolVisto | null = null;
  hayFirmaVisto = false;
  guardandoVisto = false;

  /** Filas con el detalle IPERC desplegado — "ver inline" antes de firmar, sin salir de la lista.
   *  El listado (svc.listar) YA NO trae pasos/epps/herramientas/riesgos por fila (eran includes
   *  pesados repetidos en cada una de las 20 filas de cada página, la causa real de la lentitud
   *  con cientos de ATS/día) — ese detalle se pide recién acá, por ATS individual, solo cuando el
   *  usuario hace clic en "Ver detalle". */
  filasExpandidas = new Set<number>();
  detalleCargando = new Set<number>();

  toggleDetalle(a: AtsResponseDto): void {
    if (this.filasExpandidas.has(a.id)) {
      this.filasExpandidas.delete(a.id);
      this.cdr.markForCheck();
      return;
    }
    this.filasExpandidas.add(a.id);
    if (a.pasos.length === 0 && a.riesgos.length === 0 && a.epps.length === 0 && a.herramientas.length === 0) {
      this.cargarDetalle(a);
    }
    this.cdr.markForCheck();
  }
  filaExpandida(atsId: number): boolean {
    return this.filasExpandidas.has(atsId);
  }

  private cargarDetalle(a: AtsResponseDto): void {
    this.detalleCargando.add(a.id);
    this.cdr.markForCheck();
    this.svc.getPorId(a.id).subscribe({
      next: (full) => {
        a.pasos = full.pasos;
        a.riesgos = full.riesgos;
        a.epps = full.epps;
        a.herramientas = full.herramientas;
        this.detalleCargando.delete(a.id);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.detalleCargando.delete(a.id);
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** La firma que este Residente/Ing. Producción/SSOMA ya capturó para SU PROPIA autorización
   *  (misma pestaña "Autorizaciones", mismo mecanismo que usa el trabajador para su ATS) — se
   *  reutiliza acá en vez de obligarlo a redibujar cada vez que autoriza/da visto bueno a otro. */
  firmaAutorizadaDataUrl: string | null = null;
  usandoFirmaAutorizada = false;

  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  readonly headerTabs = ATS_HEADER_TABS;

  constructor(
    private svc: AtsService,
    private petarSvc: PetarService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    // Defaults: hoy + "solo pendientes de mi firma" — así el Residente/Producción/SSOMA abre la
    // lista y ve directo lo que le toca revisar hoy, no el histórico completo de la empresa.
    const hoy = new Date().toISOString().slice(0, 10);
    this.filtroFechaDesde = hoy;
    this.filtroFechaHasta = hoy;
    this.soloPendientes = true;
    const guardados = this.leerFiltrosGuardados();
    if (guardados) {
      // Volver desde un panel/wizard conserva lo que el usuario había elegido, no los predeterminados.
      this.filtroProyectoId = guardados.proyectoId;
      this.filtroEstado = guardados.estado;
      this.filtroFechaDesde = guardados.desde;
      this.filtroFechaHasta = guardados.hasta;
      this.soloPendientes = guardados.soloPendientes;
      this.vista = guardados.vista;
      this.page = guardados.page;
    }

    // Primero el proyecto actual (endpoint liviano), después UNA sola carga del listado — antes se
    // disparaban dos (una sin proyecto y otra con él) y se traía el init completo del wizard.
    this.svc.getListaInit().subscribe({
      next: (init) => {
        this.proyectos = [...init.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (init.proyectoActualId && !guardados) this.filtroProyectoId = init.proyectoActualId;
        this.cargar();
      },
      error: () => this.cargar(),
    });
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  private static readonly CLAVE_FILTROS = 'ats-lista-filtros';

  private leerFiltrosGuardados(): { proyectoId: number | null; estado: string | null; desde: string; hasta: string;
    soloPendientes: boolean; vista: 'individuales' | 'grupales'; page: number } | null {
    try {
      const raw = sessionStorage.getItem(AtsLista.CLAVE_FILTROS);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private guardarFiltros(): void {
    try {
      sessionStorage.setItem(AtsLista.CLAVE_FILTROS, JSON.stringify({
        proyectoId: this.filtroProyectoId, estado: this.filtroEstado,
        desde: this.filtroFechaDesde, hasta: this.filtroFechaHasta,
        soloPendientes: this.soloPendientes, vista: this.vista, page: this.page,
      }));
    } catch { /* sin storage (modo privado) — simplemente no se recuerda */ }
  }

  cargar(): void {
    this.guardarFiltros();
    this.loading = true;
    const filtro: AtsFiltroDto = {
      proyectoId: this.filtroProyectoId ?? undefined,
      estado: this.filtroEstado ?? undefined,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
      // Los ATS que nacieron de una cuadrilla se ven en la vista "Grupales", no repetidos aquí.
      soloIndividuales: true,
      page: this.page,
    };
    if (this.vista === 'grupales') {
      this.svc.listarGrupos(filtro).subscribe({
        next: (res) => {
          this.grupos = res.data;
          this.totalRecords = res.totalRecords;
          this.totalPages = res.totalPages;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
      return;
    }
    this.svc.listar(filtro).subscribe({
      next: (res) => {
        this.lista = res.data;
        this.totalRecords = res.totalRecords;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  filtrar(): void {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.filtroEstado = null;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.page = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.page = p;
    this.cargar();
  }

  nuevoAts(): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo']);
  }

  nuevoAtsGrupal(): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { grupal: 1 } });
  }

  /** QR fijo por proyecto (idempotente — el backend devuelve el mismo si ya existe) para que
   *  cualquier integrante de la cuadrilla, incluso sin cuenta en la plataforma, pueda crear un
   *  ATS grupal desde /ats-grupal/crear/:token. Pensado para imprimirse y pegarse en la obra. */
  verQrProyecto(): void {
    if (!this.filtroProyectoId) return;
    this.svc.getQrProyecto(this.filtroProyectoId).subscribe({
      next: ({ token }) => {
        const url = `${window.location.origin}/ats-grupal/crear/${token}`;
        QRCode.toDataURL(url, { width: 320, margin: 2 }).then((qrDataUrl) => {
          Swal.fire({
            title: 'QR de obra — crear ATS grupal',
            html: `
              <p style="font-size:13px;color:#6b7280;margin-bottom:10px">
                Pégalo/imprímelo en la obra. Cualquier integrante de una cuadrilla, incluso sin cuenta en la plataforma, lo escanea para armar el ATS grupal del día.
              </p>
              <img src="${qrDataUrl}" style="width:100%;max-width:280px" />
            `,
            confirmButtonText: 'Copiar link',
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
          }).then((r) => {
            if (r.isConfirmed) navigator.clipboard?.writeText(url);
          });
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Un ATS en Borrador se guardó hasta el paso 3 (Valoración) pero nunca llegó a Firmar — antes
   *  no había forma de retomarlo, quedaba huérfano en la lista para siempre. */
  continuarAts(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { continuar: a.id } });
  }

  generarPetar(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/petar/nuevo'], { queryParams: { atsId: a.id } });
  }

  /** Un ATS firmado es inmutable — la única forma de corregirlo (condición real en campo
   *  distinta a la evaluada) es un ATS nuevo enlazado, y solo tiene sentido el mismo día. */
  esCorregibleHoy(a: AtsResponseDto): boolean {
    return a.estado === 'Firmado' && a.fecha === new Date().toISOString().slice(0, 10);
  }

  corregirAts(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { corregir: a.id } });
  }

  /** Misma tarea y riesgos, otro lugar (ej. Torre B en vez de Torre A) — reusa el mismo
   *  prellenado que "Corregir", solo cambia el aviso que ve el trabajador. */
  duplicarAts(a: AtsResponseDto): void {
    this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { duplicar: a.id } });
  }

  descargarPdf(ats: AtsResponseDto): void {
    const key = `desc-ats-${ats.id}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.svc.getPdfBlob(ats.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ats.codigo ?? 'ATS-' + ats.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.terminar(key);
      },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }

  /** "Torre A, Piso 1, Piso 2, Piso 3, Piso 4, Cisterna 1, Azotea" desbordaba la celda y rompía
   *  la tabla entera — comprime pisos consecutivos en rango ("Piso 1-4") y, si aun así es largo,
   *  lo corta con "…" dejando el texto completo en el title (tooltip) para no perder info. */
  lugarCompacto(a: AtsResponseDto): string {
    if (a.torreNombre) {
      const pisos = this.comprimirPisos(a.pisos);
      return pisos ? `Torre ${a.torreNombre} — ${pisos}` : `Torre ${a.torreNombre}`;
    }
    return a.lugar ?? '';
  }

  lugarCompletoTitle(a: AtsResponseDto): string {
    if (a.torreNombre) return a.pisos ? `Torre ${a.torreNombre}, ${a.pisos}` : `Torre ${a.torreNombre}`;
    return a.lugar ?? '';
  }

  /** Lugar de una cuadrilla con los pisos consecutivos comprimidos ("Piso 1-33"). */
  lugarGrupo(g: AtsGrupoListaItemDto): string {
    if (g.torreNombre) {
      const pisos = comprimirPisos(g.pisos);
      return pisos ? `Torre ${g.torreNombre} — ${pisos}` : `Torre ${g.torreNombre}`;
    }
    return g.lugar ?? '';
  }

  private comprimirPisos(pisos?: string): string {
    return comprimirPisos(pisos);
  }

  estadoClass(estado: string): string {
    if (estado === 'Firmado') return 'badge-firmado';
    if (estado === 'Cerrado') return 'badge-cerrado';
    return 'badge-borrador';
  }

  /** Lo que Samuel pidió: ver de un vistazo qué ATS ya firmados todavía no tienen las dos
   *  firmas adicionales (Autoriza / Visto Bueno SSOMA), sin importar el proyecto. */
  get listaFiltrada(): AtsResponseDto[] {
    if (!this.soloPendientes) return this.lista;
    return this.lista.filter((a) => a.estado === 'Firmado' && (!a.autorizaFirmaUrl || !a.ssomaFirmaUrl));
  }

  toggleSoloPendientes(): void {
    this.soloPendientes = !this.soloPendientes;
    this.guardarFiltros();
    this.cdr.markForCheck();
  }

  // ── Firma de Autoriza / Visto Bueno SSOMA ──────────────────────────────

  abrirFirmaVisto(ats: AtsResponseDto, rol: RolVisto, petarId: number | null = null): void {
    this.atsFirmandoVisto = ats;
    this.petarFirmandoId = petarId;
    this.rolVisto = rol;
    this.hayFirmaVisto = false;
    this.usandoFirmaAutorizada = false;
    this.firmaAutorizadaDataUrl = null;
    this.cdr.markForCheck();

    if (ats.riesgos.length === 0 && rol !== 'petar-supervisor' && rol !== 'petar-ssoma') {
      this.cargarDetalle(ats);
    }

    this.svc.getMiFirmaDigitalAutorizacionImagenBlob().subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.firmaAutorizadaDataUrl = typeof reader.result === 'string' ? reader.result : null;
          this.cdr.markForCheck();
        };
        reader.readAsDataURL(blob);
      },
      // 404 = todavía no capturó su firma digital autorizada — sigue el flujo de dibujar a mano.
      error: () => this.cdr.markForCheck(),
    });
  }

  cerrarFirmaVisto(): void {
    this.atsFirmandoVisto = null;
    this.petarFirmandoId = null;
    this.rolVisto = null;
    this.firmaAutorizadaDataUrl = null;
    this.usandoFirmaAutorizada = false;
    this.cdr.markForCheck();
  }

  onFirmaVistoChange(tieneTrazo: boolean): void {
    this.hayFirmaVisto = tieneTrazo;
  }

  dibujarFirmaVistoNueva(): void {
    this.usandoFirmaAutorizada = false;
    this.firmaPad?.clear();
    this.cdr.markForCheck();
  }

  usarFirmaAutorizada(): void {
    if (!this.firmaAutorizadaDataUrl) return;
    this.usandoFirmaAutorizada = true;
    this.cdr.markForCheck();
  }

  get vistoTitulo(): string {
    switch (this.rolVisto) {
      case 'capataz': return 'Firmar como Capataz / Maestro de Obra';
      case 'autoriza': return 'Firmar como Autoriza (Residente / Ing. Producción)';
      case 'ssoma': return 'Visto Bueno SSOMA (ATS)';
      case 'petar-supervisor': return 'Firmar PETAR como Supervisor/Responsable';
      case 'petar-ssoma': return 'Visto Bueno SSOMA (PETAR)';
      default: return '';
    }
  }

  guardarFirmaVisto(): void {
    const ats = this.atsFirmandoVisto;
    if (!ats || !this.rolVisto || this.guardandoVisto) return;

    // La firma ya no se dibuja: el backend usa SIEMPRE la firma digital registrada del usuario.
    if (!this.firmaAutorizadaDataUrl) {
      Swal.fire({ icon: 'error', title: 'Sin firma digital', text: 'No tienes una firma digital registrada. Pide al Coordinador SSOMA que la capture en Autorizaciones.' });
      return;
    }
    const firma = '';

    this.guardandoVisto = true;
    this.cdr.markForCheck();

    let req$;
    switch (this.rolVisto) {
      // Cuadrilla (QR): el Capataz firma UNA vez por grupo, no por cada ATS — se copia a todos.
      case 'capataz': req$ = ats.atsGrupoId
        ? this.svc.firmarCapatazGrupo(ats.atsGrupoId, { firmaBase64: firma })
        : this.svc.firmarCapataz(ats.id, { firmaBase64: firma }); break;
      case 'autoriza': req$ = this.svc.firmarAutorizacion(ats.id, { firmaBase64: firma }); break;
      case 'ssoma': req$ = this.svc.firmarVistoSsoma(ats.id, { firmaBase64: firma }); break;
      case 'petar-supervisor': req$ = this.petarSvc.firmarSupervisor(this.petarFirmandoId!, { firmaBase64: firma }); break;
      case 'petar-ssoma': req$ = this.petarSvc.firmarVistoSsoma(this.petarFirmandoId!, { firmaBase64: firma }); break;
    }

    req$.subscribe({
      next: () => {
        this.guardandoVisto = false;
        this.cerrarFirmaVisto();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoVisto = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** El checklist (paso 1) del PETAR ya se guardó cuando se generó — acá solo falta la firma
   *  del ejecutante, así que retoma directo en ese paso (ver AtsNuevo.continuarAts, mismo patrón). */
  continuarPetar(petarId: number): void {
    this.router.navigate(['/ssoma/gestion/petar/nuevo'], { queryParams: { petarId } });
  }

  /** Visor inline: el PDF se muestra en un modal dentro de la página (no pestaña nueva). */
  visorUrl: SafeResourceUrl | null = null;
  visorTitulo = '';
  private visorObjectUrl: string | null = null;

  verPdf(ats: AtsResponseDto): void {
    const key = `ver-ats-${ats.id}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.svc.getPdfBlob(ats.id).subscribe({
      next: (blob) => { this.terminar(key); this.abrirVisor(blob, `${ats.codigo ?? 'ATS'} — ${ats.workerNombre ?? ''}`); },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }

  /** Pide el motivo (obligatorio, queda registrado) y anula — nunca borra. */
  anularAts(a: AtsResponseDto): void {
    Swal.fire({
      icon: 'warning',
      title: `Anular ${a.codigo ?? 'ATS'}`,
      text: 'El ATS no se borra: queda como Anulado con el motivo, quién y cuándo.',
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Ej.: riesgo mal evaluado, lugar equivocado…',
      inputAttributes: { maxlength: '300' },
      showCancelButton: true,
      confirmButtonText: 'Anular',
      confirmButtonColor: '#b91c1c',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v || v.trim().length < 10 ? 'Escribe al menos 10 caracteres.' : null),
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.anularAts(a.id, r.value as string).subscribe({
        next: () => this.cargar(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  /** ATS cuyo modal de observaciones está abierto. */
  obsAts: AtsResponseDto | null = null;
  abrirObservaciones(a: AtsResponseDto): void { this.obsAts = a; this.cdr.markForCheck(); }
  cerrarObservaciones(): void { this.obsAts = null; this.cargar(); }

  generarPetarGrupo(g: AtsGrupoListaItemDto): void {
    this.router.navigate(['/ssoma/gestion/ats/grupo', g.id], { queryParams: { petar: 1 } });
  }

  verPdfGrupo(g: AtsGrupoListaItemDto): void {
    const key = `ver-grupo-${g.id}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.svc.getPdfGrupoBlob(g.id).subscribe({
      next: (blob) => { this.terminar(key); this.abrirVisor(blob, `${g.codigo ?? 'ATS grupal #' + g.id} — ${g.actividad}`); },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }

  descargarPdfGrupo(g: AtsGrupoListaItemDto): void {
    const key = `desc-grupo-${g.id}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.svc.getPdfGrupoBlob(g.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS-GRUPAL-${g.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.terminar(key);
      },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }

  verPdfPetar(petarId: number): void {
    const key = `ver-petar-${petarId}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.petarSvc.getPdfBlob(petarId).subscribe({
      next: (blob) => { this.terminar(key); this.abrirVisor(blob, 'PETAR'); },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }

  private abrirVisor(blob: Blob, titulo: string): void {
    this.cerrarVisor();
    this.visorObjectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    this.visorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorObjectUrl);
    this.visorTitulo = titulo;
    this.cdr.detectChanges();
  }

  cerrarVisor(): void {
    if (this.visorObjectUrl) URL.revokeObjectURL(this.visorObjectUrl);
    this.visorObjectUrl = null;
    this.visorUrl = null;
    this.cdr.detectChanges();
  }

  descargarPdfPetar(petarId: number): void {
    const key = `desc-petar-${petarId}`;
    if (this.ocupado(key)) return;
    this.iniciar(key);
    this.petarSvc.getPdfBlob(petarId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PETAR-${petarId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.terminar(key);
      },
      error: (err: HttpErrorResponse) => { this.terminar(key); this.errorService.handleError(err); },
    });
  }
}
