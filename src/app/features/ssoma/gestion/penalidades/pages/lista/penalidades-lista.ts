import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

import { PenalidadService } from '../../services/penalidad.service';
import {
  PagedResult,
  PenalidadListItemDto,
  PenalidadDetalleDto,
  PenalidadListQuery,
  InfraccionAdminDto,
  ContextoEmpresaDto,
  OrigenCandidatoDto,
} from '../../dtos/penalidad.dtos';
import { PENALIDADES_TABS } from '../../penalidades-tabs';

import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { CatalogosSaludService } from '../../../../salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../salud-ocupacional/dtos/catalogos.model';

import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';

@Component({
  selector: 'app-penalidades-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AbrilPageHeaderComponent, FabButton,
    FilterTriggerButton, FilterModal, SearchSelect, Paginator, AbrilModalPanel,
  ],
  templateUrl: './penalidades-lista.html',
  styleUrl: './penalidades-lista.css',
})
export class PenalidadesLista implements OnInit {
  readonly tabs = PENALIDADES_TABS;
  readonly anioActual = new Date().getFullYear();

  result: PagedResult<PenalidadListItemDto> | null = null;
  loading = false;
  esContratista = false;

  filtroEstado = '';
  filtrosAbiertos = false;
  query: PenalidadListQuery = { page: 1, pageSize: 20 };

  readonly estadoFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'PendienteResidente', label: 'Pendiente Residente' },
    { value: 'PendienteGerenciaInmobiliaria', label: 'Pendiente Gerencia' },
    { value: 'NotificadaEnDescargo', label: 'En plazo de descargo' },
    { value: 'EnEvaluacionSsoma', label: 'En evaluación SSOMA' },
    { value: 'PendienteDecisionGerencia', label: 'Pendiente decisión final' },
    { value: 'Aplicada', label: 'Aplicada' },
    { value: 'EnApelacion', label: 'En apelación' },
    { value: 'Anulada', label: 'Anulada' },
    { value: 'Rechazada', label: 'Rechazada' },
  ];

  get filtrosActivos(): number {
    return this.filtroEstado ? 1 : 0;
  }

  // ── Modal Nueva Penalidad ────────────────────────────────────────
  mostrarNueva = false;
  guardandoNueva = false;
  proyectos: ProjectGetDTO[] = [];
  empresas: EmpresaSimpleDto[] = [];
  infracciones: InfraccionAdminDto[] = [];
  loadingCatalogos = false;

  nuevaOrigenTipo: 'RAC' | 'AMONESTACION' | 'DIRECTO' = 'DIRECTO';
  nuevaOrigenId: number | null = null;
  nuevaEmpresaId: number | null = null;
  nuevaProyectoId: number | null = null;
  nuevaInfraccionId: number | null = null;
  nuevaSeveridad = '';
  nuevaDescripcion = '';

  candidatosOrigen: OrigenCandidatoDto[] = [];
  loadingCandidatosOrigen = false;

  readonly ORIGEN_OPCIONES = [
    { value: 'DIRECTO', label: 'Hallazgo directo (sin RAC/Amonestación previa)' },
    { value: 'RAC', label: 'Viene de un RAC' },
    { value: 'AMONESTACION', label: 'Viene de una Amonestación' },
  ];

  readonly SEVERIDAD_OPCIONES = [
    { value: 'CRITICO', label: 'Crítico' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'BAJO', label: 'Bajo' },
  ];

  // ── Contexto previo de la empresa (reincidencia + gestión previa) ─
  contexto: ContextoEmpresaDto | null = null;
  loadingContexto = false;

  gpTipo: 'Correo' | 'CartaPreocupacion' | 'Reunion' | 'Llamada' | 'Otro' = 'Correo';
  gpFecha = '';
  gpDescripcion = '';
  gpAdjuntoUrl: string | null = null;
  gpSubiendoAdjunto = false;
  guardandoGestionPrevia = false;
  mostrarFormGestionPrevia = false;

  readonly GP_TIPO_OPCIONES = [
    { value: 'Correo', label: 'Correo de advertencia' },
    { value: 'CartaPreocupacion', label: 'Carta de preocupación' },
    { value: 'Reunion', label: 'Reunión' },
    { value: 'Llamada', label: 'Llamada' },
    { value: 'Otro', label: 'Otro' },
  ];

  // ── Modal Detalle ────────────────────────────────────────────────
  mostrarDetalle = false;
  loadingDetalle = false;
  detalle: PenalidadDetalleDto | null = null;
  guardandoAccion = false;

  motivoRechazo = '';
  descargoTexto = '';
  documentoUrl: string | null = null;
  subiendoDocumento = false;

  recomendacionSsoma: 'Aprobar' | 'Rechazar' | '' = '';
  argumentoSsoma = '';

  resolucionTipo: 'Aplicada' | 'Anulada' | '' = '';
  resolucionTexto = '';
  montoFinal: number | null = null;
  motivoAjusteMonto = '';
  motivoObjecionGerencia = '';

  apelacionTexto = '';
  apelacionDocumentoUrl: string | null = null;
  subiendoDocumentoApelacion = false;
  decisionApelacionTipo: 'Aplicada' | 'Anulada' | '' = '';
  decisionApelacionTexto = '';

  constructor(
    private penalidadService: PenalidadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private projectService: ProjectService,
    private catalogosSalud: CatalogosSaludService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.esContratista = this.authService.isContratista();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: PenalidadListQuery = { ...this.query, estado: this.filtroEstado || undefined, page: 1 };
    this.query = q;
    this.penalidadService.getList(q).subscribe({
      next: (res) => { this.result = res; this.loading = false; this.loaderService.hide(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loading = false; this.loaderService.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  limpiarFiltros(): void { this.filtroEstado = ''; this.load(); }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  // ── Nueva ────────────────────────────────────────────────────────

  abrirNueva(): void {
    this.nuevaOrigenTipo = 'DIRECTO';
    this.nuevaOrigenId = null;
    this.nuevaEmpresaId = null;
    this.nuevaProyectoId = null;
    this.nuevaInfraccionId = null;
    this.nuevaSeveridad = '';
    this.nuevaDescripcion = '';
    this.candidatosOrigen = [];
    this.contexto = null;
    this.mostrarFormGestionPrevia = false;
    this.mostrarNueva = true;
    this.loadingCatalogos = true;
    this.cdr.markForCheck();

    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, estado: 'ACTIVO' }),
      empresas: this.catalogosSalud.getEmpresas(),
      infracciones: this.penalidadService.getInfracciones(),
    }).subscribe({
      next: ({ proyectos, empresas, infracciones }) => {
        this.proyectos = proyectos.data;
        this.empresas = empresas;
        this.infracciones = infracciones;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarNueva(): void { this.mostrarNueva = false; this.cdr.markForCheck(); }

  onOrigenTipoChange(tipo: 'RAC' | 'AMONESTACION' | 'DIRECTO'): void {
    this.nuevaOrigenTipo = tipo;
    this.nuevaOrigenId = null;
    this.candidatosOrigen = [];
    if (tipo === 'DIRECTO') { this.cdr.markForCheck(); return; }

    this.loadingCandidatosOrigen = true;
    this.cdr.markForCheck();
    this.penalidadService.getOrigenesCandidatos().subscribe({
      next: (candidatos) => {
        this.candidatosOrigen = candidatos.filter((c) => c.origenTipo === tipo);
        this.loadingCandidatosOrigen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCandidatosOrigen = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onOrigenCandidatoSeleccionado(id: number | null): void {
    this.nuevaOrigenId = id;
    const candidato = this.candidatosOrigen.find((c) => c.id === id);
    if (!candidato) return;

    this.nuevaProyectoId = candidato.proyectoId;
    if (candidato.infraccionSugeridaId) this.nuevaInfraccionId = candidato.infraccionSugeridaId;
    if (candidato.severidad) this.nuevaSeveridad = candidato.severidad;
    this.nuevaDescripcion = candidato.descripcion;
    if (candidato.empresaId) this.onEmpresaSeleccionada(candidato.empresaId);
    this.cdr.markForCheck();
  }

  onEmpresaSeleccionada(empresaId: number | null): void {
    this.nuevaEmpresaId = empresaId;
    this.contexto = null;
    if (!empresaId) { this.cdr.markForCheck(); return; }

    this.loadingContexto = true;
    this.cdr.markForCheck();
    this.penalidadService.getContextoEmpresa(empresaId).subscribe({
      next: (c) => { this.contexto = c; this.loadingContexto = false; this.cdr.markForCheck(); },
      error: () => { this.loadingContexto = false; this.cdr.markForCheck(); },
    });
  }

  abrirFormGestionPrevia(): void {
    this.gpTipo = 'Correo';
    this.gpFecha = new Date().toISOString().slice(0, 10);
    this.gpDescripcion = '';
    this.gpAdjuntoUrl = null;
    this.mostrarFormGestionPrevia = true;
    this.cdr.markForCheck();
  }

  seleccionarAdjuntoGestionPrevia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.nuevaEmpresaId) return;
    this.gpSubiendoAdjunto = true;
    this.cdr.markForCheck();
    this.penalidadService.subirAdjuntoGestionPrevia(this.nuevaEmpresaId, file).subscribe({
      next: (res) => { this.gpAdjuntoUrl = res.url; this.gpSubiendoAdjunto = false; this.cdr.markForCheck(); },
      error: () => { this.gpSubiendoAdjunto = false; Swal.fire('Error', 'No se pudo subir el adjunto', 'error'); this.cdr.markForCheck(); },
    });
  }

  get puedeGuardarGestionPrevia(): boolean {
    return !!(this.nuevaEmpresaId && this.gpFecha && this.gpDescripcion.trim() && !this.guardandoGestionPrevia);
  }

  guardarGestionPrevia(): void {
    if (!this.puedeGuardarGestionPrevia) return;
    this.guardandoGestionPrevia = true;
    this.penalidadService.registrarGestionPrevia({
      empresaId: this.nuevaEmpresaId!,
      proyectoId: this.nuevaProyectoId ?? undefined,
      tipo: this.gpTipo,
      fecha: this.gpFecha,
      descripcion: this.gpDescripcion.trim(),
      adjuntoUrl: this.gpAdjuntoUrl ?? undefined,
    }).subscribe({
      next: () => {
        this.guardandoGestionPrevia = false;
        this.mostrarFormGestionPrevia = false;
        Swal.fire({ icon: 'success', title: 'Registrado', timer: 1500, showConfirmButton: false });
        this.onEmpresaSeleccionada(this.nuevaEmpresaId);
      },
      error: (err: HttpErrorResponse) => { this.guardandoGestionPrevia = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  gpTipoLabel(tipo: string): string {
    return this.GP_TIPO_OPCIONES.find((o) => o.value === tipo)?.label ?? tipo;
  }

  get puedeGuardarNueva(): boolean {
    return !!(this.nuevaEmpresaId && this.nuevaProyectoId && this.nuevaInfraccionId
      && this.nuevaSeveridad && !this.guardandoNueva);
  }

  guardarNueva(): void {
    if (!this.puedeGuardarNueva) return;
    this.guardandoNueva = true;
    this.penalidadService.registrar({
      origenTipo: this.nuevaOrigenTipo,
      origenId: this.nuevaOrigenTipo === 'DIRECTO' ? undefined : (this.nuevaOrigenId ?? undefined),
      empresaId: this.nuevaEmpresaId!,
      proyectoId: this.nuevaProyectoId!,
      infraccionId: this.nuevaInfraccionId!,
      severidad: this.nuevaSeveridad,
      descripcionOcurrido: this.nuevaDescripcion || undefined,
    }).subscribe({
      next: (res) => {
        this.guardandoNueva = false;
        Swal.fire({ icon: 'success', title: 'Penalidad registrada', html: `Código: <b>${res.codigo}</b><br>Queda pendiente de aprobación del Residente.`, timer: 2500, showConfirmButton: false });
        this.cerrarNueva();
        this.load();
      },
      error: (err: HttpErrorResponse) => { this.guardandoNueva = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── Detalle ──────────────────────────────────────────────────────

  abrirDetalle(id: number): void {
    this.mostrarDetalle = true;
    this.loadingDetalle = true;
    this.detalle = null;
    this.motivoRechazo = '';
    this.descargoTexto = '';
    this.documentoUrl = null;
    this.recomendacionSsoma = '';
    this.argumentoSsoma = '';
    this.resolucionTipo = '';
    this.resolucionTexto = '';
    this.montoFinal = null;
    this.motivoAjusteMonto = '';
    this.motivoObjecionGerencia = '';
    this.apelacionTexto = '';
    this.apelacionDocumentoUrl = null;
    this.decisionApelacionTipo = '';
    this.decisionApelacionTexto = '';
    this.cdr.markForCheck();

    this.penalidadService.getDetalle(id).subscribe({
      next: (d) => { this.detalle = d; this.loadingDetalle = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingDetalle = false; this.mostrarDetalle = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  cerrarDetalle(): void { this.mostrarDetalle = false; this.detalle = null; this.cdr.markForCheck(); }

  private recargarDetalle(id: number): void {
    this.penalidadService.getDetalle(id).subscribe({ next: (d) => { this.detalle = d; this.cdr.markForCheck(); } });
  }

  aprobarResidente(): void {
    if (!this.detalle) return;
    this.guardandoAccion = true;
    this.penalidadService.aprobarResidente(this.detalle.id).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Aprobado', 'Penalidad enviada a Gerencia Inmobiliaria', 'success'); this.recargarDetalle(this.detalle!.id); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  rechazarResidente(): void {
    if (!this.detalle || !this.motivoRechazo.trim()) return;
    this.guardandoAccion = true;
    this.penalidadService.rechazarResidente(this.detalle.id, { motivo: this.motivoRechazo.trim() }).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Rechazado', '', 'success'); this.cerrarDetalle(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  aprobarGerencia(): void {
    if (!this.detalle) return;
    this.guardandoAccion = true;
    this.penalidadService.aprobarGerencia(this.detalle.id).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Aprobado', 'Se notificó al contratista con el plazo de descargo', 'success'); this.recargarDetalle(this.detalle!.id); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  rechazarGerencia(): void {
    if (!this.detalle || !this.motivoRechazo.trim()) return;
    this.guardandoAccion = true;
    this.penalidadService.rechazarGerencia(this.detalle.id, { motivo: this.motivoRechazo.trim() }).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Rechazado', '', 'success'); this.cerrarDetalle(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  seleccionarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.detalle) return;
    this.subiendoDocumento = true;
    this.cdr.markForCheck();
    this.penalidadService.subirDocumento(this.detalle.id, file).subscribe({
      next: (res) => { this.documentoUrl = res.url; this.subiendoDocumento = false; this.cdr.markForCheck(); },
      error: () => { this.subiendoDocumento = false; Swal.fire('Error', 'No se pudo subir el documento', 'error'); this.cdr.markForCheck(); },
    });
  }

  get puedeDescargar(): boolean {
    return this.descargoTexto.trim().length >= 10 && !!this.documentoUrl && !this.guardandoAccion;
  }

  presentarDescargo(): void {
    if (!this.detalle || !this.puedeDescargar) return;
    this.guardandoAccion = true;
    this.penalidadService.presentarDescargo(this.detalle.id, { descargoTexto: this.descargoTexto.trim(), documentoUrl: this.documentoUrl! }).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Descargo presentado', '', 'success'); this.cerrarDetalle(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get puedeEvaluar(): boolean {
    return !!this.recomendacionSsoma && this.argumentoSsoma.trim().length >= 10 && !this.guardandoAccion;
  }

  evaluarDescargo(): void {
    if (!this.detalle || !this.puedeEvaluar) return;
    this.guardandoAccion = true;
    this.penalidadService.evaluarDescargo(this.detalle.id, { recomendacion: this.recomendacionSsoma as 'Aprobar' | 'Rechazar', argumento: this.argumentoSsoma.trim() }).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Evaluación registrada', 'Se envió a Gerencia Inmobiliaria para la decisión final', 'success'); this.cerrarDetalle(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get puedeDecidir(): boolean {
    return !!this.resolucionTipo && !this.guardandoAccion;
  }

  decidirGerencia(): void {
    if (!this.detalle || !this.puedeDecidir) return;
    Swal.fire({
      title: this.resolucionTipo === 'Aplicada' ? '¿Aplicar penalidad?' : '¿Anular penalidad?',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar',
      confirmButtonColor: this.resolucionTipo === 'Aplicada' ? '#b91c1c' : '#2e7d32',
    }).then((result) => {
      if (!result.isConfirmed || !this.detalle) return;
      this.guardandoAccion = true;
      this.penalidadService.decidirGerencia(this.detalle.id, {
        resolucionTipo: this.resolucionTipo as 'Aplicada' | 'Anulada',
        resolucionTexto: this.resolucionTexto || undefined,
        montoFinal: this.montoFinal ?? undefined,
        motivoAjusteMonto: this.motivoAjusteMonto || undefined,
        motivoObjecionGerencia: this.motivoObjecionGerencia || undefined,
      }).subscribe({
        next: () => { this.guardandoAccion = false; Swal.fire('Listo', `Penalidad ${this.resolucionTipo!.toLowerCase()}`, 'success'); this.cerrarDetalle(); this.load(); },
        error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
      });
    });
  }

  seleccionarDocumentoApelacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.detalle) return;
    this.subiendoDocumentoApelacion = true;
    this.cdr.markForCheck();
    this.penalidadService.subirDocumento(this.detalle.id, file).subscribe({
      next: (res) => { this.apelacionDocumentoUrl = res.url; this.subiendoDocumentoApelacion = false; this.cdr.markForCheck(); },
      error: () => { this.subiendoDocumentoApelacion = false; Swal.fire('Error', 'No se pudo subir el documento', 'error'); this.cdr.markForCheck(); },
    });
  }

  get puedeApelar(): boolean {
    return this.apelacionTexto.trim().length >= 10 && !!this.apelacionDocumentoUrl && !this.guardandoAccion;
  }

  apelar(): void {
    if (!this.detalle || !this.puedeApelar) return;
    this.guardandoAccion = true;
    this.penalidadService.apelar(this.detalle.id, { texto: this.apelacionTexto.trim(), documentoUrl: this.apelacionDocumentoUrl! }).subscribe({
      next: () => { this.guardandoAccion = false; Swal.fire('Apelación presentada', 'Se envió a Gerencia Inmobiliaria para la decisión final', 'success'); this.cerrarDetalle(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get puedeDecidirApelacion(): boolean {
    return !!this.decisionApelacionTipo && !this.guardandoAccion;
  }

  decidirApelacion(): void {
    if (!this.detalle || !this.puedeDecidirApelacion) return;
    Swal.fire({
      title: this.decisionApelacionTipo === 'Aplicada' ? '¿Mantener la penalidad aplicada?' : '¿Anular la penalidad?',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar',
      confirmButtonColor: this.decisionApelacionTipo === 'Aplicada' ? '#b91c1c' : '#2e7d32',
    }).then((result) => {
      if (!result.isConfirmed || !this.detalle) return;
      this.guardandoAccion = true;
      this.penalidadService.decidirApelacion(this.detalle.id, {
        resolucionTipo: this.decisionApelacionTipo as 'Aplicada' | 'Anulada',
        resolucionTexto: this.decisionApelacionTexto || undefined,
      }).subscribe({
        next: () => { this.guardandoAccion = false; Swal.fire('Listo', 'Apelación resuelta', 'success'); this.cerrarDetalle(); this.load(); },
        error: (err: HttpErrorResponse) => { this.guardandoAccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
      });
    });
  }

  estadoClass(est: string): string {
    switch (est) {
      case 'PendienteResidente':
      case 'PendienteGerenciaInmobiliaria': return 'pen-pendiente';
      case 'NotificadaEnDescargo': return 'pen-descargo';
      case 'EnEvaluacionSsoma':
      case 'PendienteDecisionGerencia': return 'pen-evaluacion';
      case 'Aplicada': return 'pen-aplicada';
      case 'EnApelacion': return 'pen-evaluacion';
      case 'Anulada': return 'pen-anulada';
      case 'Rechazada': return 'pen-rechazada';
      default: return '';
    }
  }

  estadoLabel(est: string): string {
    const opt = this.estadoFilterOptions.find((o) => o.value === est);
    return opt?.label ?? est;
  }
}
