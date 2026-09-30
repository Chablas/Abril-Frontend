import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
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
import { AtsResponseDto, AtsFiltroDto, AtsProyectoDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PetarService } from '../../../petar/services/petar.service';

type RolVisto = 'autoriza' | 'ssoma' | 'petar-supervisor' | 'petar-ssoma';

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
  ],
  templateUrl: './ats-lista.html',
  styleUrl: './ats-lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsLista implements OnInit {
  lista: AtsResponseDto[] = [];
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
  ) {}

  ngOnInit(): void {
    // Defaults: hoy + "solo pendientes de mi firma" — así el Residente/Producción/SSOMA abre la
    // lista y ve directo lo que le toca revisar hoy, no el histórico completo de la empresa.
    const hoy = new Date().toISOString().slice(0, 10);
    this.filtroFechaDesde = hoy;
    this.filtroFechaHasta = hoy;
    this.soloPendientes = true;

    this.svc.getInit().subscribe({
      next: (init) => {
        this.proyectos = [...init.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (init.proyectoActualId) {
          this.filtroProyectoId = init.proyectoActualId;
          this.cargar();
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.cargar();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  cargar(): void {
    this.loading = true;
    const filtro: AtsFiltroDto = {
      proyectoId: this.filtroProyectoId ?? undefined,
      estado: this.filtroEstado ?? undefined,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
      page: this.page,
    };
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
    this.svc.getPdfBlob(ats.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS-${ats.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
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

    const firma = this.usandoFirmaAutorizada ? this.firmaAutorizadaDataUrl : this.firmaPad?.toDataUrl();
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.guardandoVisto = true;
    this.cdr.markForCheck();

    let req$;
    switch (this.rolVisto) {
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

  descargarPdfPetar(petarId: number): void {
    this.petarSvc.getPdfBlob(petarId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PETAR-${petarId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
