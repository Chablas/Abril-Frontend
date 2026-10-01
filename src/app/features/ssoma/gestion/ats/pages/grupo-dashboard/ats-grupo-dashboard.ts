import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { AtsService } from '../../services/ats.service';
import { AtsObservaciones } from '../observaciones/ats-observaciones';
import { comprimirPisos } from '../../shared/ats-lugar';
import { AtsGrupoEstadoDto, AtsGrupoWorkerOpcionDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PetarService } from '../../../petar/services/petar.service';
import { PetarTipoDto, PetarGrupoEstadoDto, RespuestaChecklist } from '../../../petar/dtos/petar.dtos';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';

/**
 * Panel del autor de un ATS grupal: el QR para que la cuadrilla se adhiera, y cuántos ya
 * firmaron en vivo. Se refresca solo cada 15s mientras el grupo sigue "Activo" — así el autor no
 * tiene que estar tocando "Actualizar" a cada rato durante la charla de 5 minutos.
 */
@Component({
  selector: 'app-ats-grupo-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilModalPanel, SignaturePad, AtsObservaciones],
  templateUrl: './ats-grupo-dashboard.html',
  styleUrl: './ats-grupo-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsGrupoDashboard implements OnInit, OnDestroy {
  id!: number;
  grupo: AtsGrupoEstadoDto | null = null;
  qrDataUrl: string | null = null;
  loading = true;
  cerrando = false;

  // ── PETAR grupal ──────────────────────────────────────────────────────
  petares: PetarGrupoEstadoDto[] = [];
  mostrarFormPetar = false;
  guardandoPetar = false;
  tipos: PetarTipoDto[] = [];
  nuevoTipoId: number | null = null;
  nuevaDescripcion = '';
  nuevoLugar = '';
  nuevaHoraInicio = '';
  nuevaHoraFin = '';
  respuestasPorItem = new Map<number, RespuestaChecklist>();

  // Firma de Supervisor/SSOMA de un PETAR grupal puntual
  petarFirmando: PetarGrupoEstadoDto | null = null;
  rolFirmando: 'Supervisor' | 'Ssoma' | null = null;
  hayFirmaPetar = false;
  guardandoFirmaPetar = false;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  private refrescoInterval?: ReturnType<typeof setInterval>;

  constructor(
    private svc: AtsService,
    private petarSvc: PetarService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.cargarPetares();
    // Viene del botón "Generar PETAR" del listado de cuadrillas.
    if (this.route.snapshot.queryParamMap.get('petar')) this.abrirFormPetar();
    this.refrescoInterval = setInterval(() => {
      if (this.grupo?.estado === 'Activo') { this.cargar(false); this.cargarPetares(); }
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refrescoInterval) clearInterval(this.refrescoInterval);
  }

  cargar(mostrarLoading = true): void {
    if (mostrarLoading) this.loading = true;
    this.svc.getEstadoGrupo(this.id).subscribe({
      next: (res) => {
        this.grupo = res;
        this.loading = false;
        this.cdr.markForCheck();
        if (!this.qrDataUrl) this.generarQr(res.qrToken);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private generarQr(token: string): void {
    const url = `${window.location.origin}/ats-grupal/${token}`;
    QRCode.toDataURL(url, { width: 360, margin: 2 }).then((dataUrl) => {
      this.qrDataUrl = dataUrl;
      this.cdr.markForCheck();
    });
  }

  get linkAdhesion(): string {
    return this.grupo ? `${window.location.origin}/ats-grupal/${this.grupo.qrToken}` : '';
  }

  copiarLink(): void {
    if (!this.linkAdhesion) return;
    navigator.clipboard?.writeText(this.linkAdhesion).then(() => {
      Swal.fire({ icon: 'success', title: 'Link copiado', timer: 1200, showConfirmButton: false });
    });
  }

  copiarLinkCapataz(): void {
    if (!this.grupo) return;
    const link = `${window.location.origin}/ats-grupal/capataz/${this.grupo.qrToken}`;
    navigator.clipboard?.writeText(link).then(() => {
      Swal.fire({ icon: 'success', title: 'Link del Capataz copiado', timer: 1200, showConfirmButton: false });
    });
  }

  cerrarGrupo(): void {
    if (!this.grupo || this.cerrando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar este ATS grupal?',
      text: 'Nadie más podrá adherirse con este QR. Los que ya firmaron quedan igual, no se ven afectados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cerrando = true;
      this.svc.cerrarGrupo(this.id).subscribe({
        next: () => {
          this.cerrando = false;
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.cerrando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/ats']);
  }

  /** "Torre A — Sótano 5, …, Piso 1-33, Cisterna 1, Azotea" en vez de listar piso por piso. */
  get lugarCompacto(): string {
    const g = this.grupo;
    if (!g?.torreNombre) return '';
    const pisos = comprimirPisos(g.pisos);
    return pisos ? `Torre ${g.torreNombre} — ${pisos}` : `Torre ${g.torreNombre}`;
  }

  // ── Seguimiento: integrantes esperados, reabrir, "sin validar" ──────────
  get esperadosFirmaron(): number { return this.grupo?.esperados.filter((e) => e.adherido).length ?? 0; }
  get pendientesNombres(): string[] { return this.grupo?.esperados.filter((e) => !e.adherido).map((e) => e.nombre) ?? []; }

  /** Firmó su ATS después de que Autoriza/SSOMA ya habían validado la cuadrilla → le falta esa validación. */
  sinValidar(ad: { estado: string; autorizaFirmado: boolean; ssomaFirmado: boolean }): boolean {
    const g = this.grupo;
    if (!g || ad.estado !== 'Firmado') return false;
    return (g.autorizaFirmados > 0 && !ad.autorizaFirmado) || (g.ssomaFirmados > 0 && !ad.ssomaFirmado);
  }

  private pedirMotivo(titulo: string, texto: string): Promise<string | null> {
    return Swal.fire({
      icon: 'warning',
      title: titulo,
      text: texto,
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Ej.: lugar equivocado, riesgo mal evaluado…',
      inputAttributes: { maxlength: '300' },
      showCancelButton: true,
      confirmButtonText: 'Anular',
      confirmButtonColor: '#b91c1c',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v || v.trim().length < 10 ? 'Escribe al menos 10 caracteres.' : null),
    }).then((r) => (r.isConfirmed ? (r.value as string) : null));
  }

  async anularGrupo(): Promise<void> {
    const motivo = await this.pedirMotivo('Anular el ATS grupal', 'Se anulan la cuadrilla y todos los ATS de sus integrantes. No se borra nada: queda el motivo, quién y cuándo.');
    if (!motivo) return;
    this.svc.anularGrupo(this.id, motivo).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Anula solo el ATS de un integrante (p. ej. firmó en el grupo equivocado); puede volver a adherirse. */
  async anularAdherido(ad: { atsId: number; nombre: string }): Promise<void> {
    const motivo = await this.pedirMotivo(`Anular el ATS de ${ad.nombre}`, 'Solo se anula su ATS; el resto de la cuadrilla no cambia.');
    if (!motivo) return;
    this.svc.anularAts(ad.atsId, motivo).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Corrección con revisión: abre el wizard precargado con este grupo; al guardar, este queda "Reemplazado". */
  corregirGrupo(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Corregir el ATS grupal?',
      text: 'Se crea una revisión nueva con este contenido para que lo ajustes. Este grupo quedará como "Reemplazado" (no se borra) y la cuadrilla deberá firmar la revisión de nuevo.',
      showCancelButton: true,
      confirmButtonText: 'Corregir',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (r.isConfirmed) this.router.navigate(['/ssoma/gestion/ats/nuevo'], { queryParams: { grupal: 1, corregirGrupo: this.id } });
    });
  }

  /** El autor se adhiere a su propia cuadrilla por el mismo link de adhesión (elige su nombre y confirma su DNI). */
  firmarMiParte(): void {
    if (!this.grupo) return;
    this.router.navigateByUrl(`/ats-grupal/${this.grupo.qrToken}`);
  }

  reabriendo = false;
  reabrir(): void {
    if (this.reabriendo) return;
    Swal.fire({
      icon: 'question',
      title: '¿Reabrir el ATS grupal?',
      text: 'Se volverán a aceptar adhesiones hoy. Quedará registrado quién lo reabrió. Los nuevos integrantes dejarán pendientes las firmas de la cadena.',
      showCancelButton: true,
      confirmButtonText: 'Reabrir',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.reabriendo = true;
      this.cdr.markForCheck();
      this.svc.reabrirGrupo(this.id).subscribe({
        next: () => { this.reabriendo = false; this.cargar(); },
        error: (err: HttpErrorResponse) => { this.reabriendo = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
      });
    });
  }

  integrantesAbierto = false;
  candidatos: AtsGrupoWorkerOpcionDto[] = [];
  seleccion = new Set<number>();
  filtroInt = '';
  guardandoInt = false;

  get candidatosFiltrados(): AtsGrupoWorkerOpcionDto[] {
    const q = this.filtroInt.trim().toLowerCase();
    return q ? this.candidatos.filter((c) => c.nombre.toLowerCase().includes(q)) : this.candidatos;
  }

  abrirIntegrantes(): void {
    this.svc.getCandidatosGrupo(this.id).subscribe({
      next: (lista) => {
        this.candidatos = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.seleccion = new Set((this.grupo?.esperados ?? []).map((e) => e.workerId));
        this.filtroInt = '';
        this.integrantesAbierto = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  toggleInt(id: number): void {
    if (this.seleccion.has(id)) this.seleccion.delete(id); else this.seleccion.add(id);
    this.cdr.markForCheck();
  }

  guardarIntegrantes(): void {
    if (this.guardandoInt) return;
    this.guardandoInt = true;
    this.svc.setIntegrantesGrupo(this.id, [...this.seleccion]).subscribe({
      next: () => { this.guardandoInt = false; this.integrantesAbierto = false; this.cargar(); },
      error: (err: HttpErrorResponse) => { this.guardandoInt = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  pdfGrupoCargando = false;

  verPdfGrupo(): void {
    if (this.pdfGrupoCargando) return;
    this.pdfGrupoCargando = true;
    this.cdr.markForCheck();
    this.svc.getPdfGrupoBlob(this.id).subscribe({
      next: (blob) => {
        this.pdfGrupoCargando = false;
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.pdfGrupoCargando = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  descargarPdfGrupo(): void {
    if (this.pdfGrupoCargando) return;
    this.pdfGrupoCargando = true;
    this.cdr.markForCheck();
    this.svc.getPdfGrupoBlob(this.id).subscribe({
      next: (blob) => {
        this.pdfGrupoCargando = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS-GRUPAL-${this.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.pdfGrupoCargando = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  verAts(atsId: number): void {
    this.svc.getPdfBlob(atsId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  descargarAts(atsId: number): void {
    this.svc.getPdfBlob(atsId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS-${atsId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  firmandoNivel: 'Autoriza' | 'Ssoma' | null = null;

  /** Firma de una vez a toda la cuadrilla con la firma digital registrada del usuario. */
  firmarNivel(nivel: 'Autoriza' | 'Ssoma'): void {
    if (this.firmandoNivel) return;
    const etiqueta = nivel === 'Autoriza' ? 'Autorizar' : 'dar Visto Bueno SSOMA a';
    Swal.fire({
      icon: 'question',
      title: `¿${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} la cuadrilla?`,
      text: 'Se firmará cada ATS pendiente de esta cuadrilla con tu firma digital registrada.',
      showCancelButton: true,
      confirmButtonText: 'Firmar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.firmandoNivel = nivel;
      this.cdr.markForCheck();
      const req$ = nivel === 'Autoriza' ? this.svc.firmarAutorizaGrupo(this.id) : this.svc.firmarSsomaGrupo(this.id);
      req$.subscribe({
        next: (res) => {
          this.firmandoNivel = null;
          Swal.fire({ icon: 'success', title: 'Listo', text: res.message, timer: 2200, showConfirmButton: false });
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.firmandoNivel = null;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  // ── PETAR grupal ──────────────────────────────────────────────────────

  cargarPetares(): void {
    this.petarSvc.getEstadosPorAtsGrupo(this.id).subscribe({
      next: (res) => { this.petares = res; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  abrirFormPetar(): void {
    this.mostrarFormPetar = true;
    this.nuevoTipoId = null;
    this.nuevaDescripcion = '';
    this.nuevoLugar = '';
    this.nuevaHoraInicio = '';
    this.nuevaHoraFin = '';
    this.respuestasPorItem.clear();
    this.cdr.markForCheck();
    if (this.tipos.length === 0) {
      this.petarSvc.getTiposCatalogo().subscribe({
        next: (res) => { this.tipos = res; this.cdr.markForCheck(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    }
  }

  cerrarFormPetar(): void {
    this.mostrarFormPetar = false;
    this.cdr.markForCheck();
  }

  get tipoSeleccionado(): PetarTipoDto | undefined {
    return this.tipos.find((t) => t.id === this.nuevoTipoId);
  }

  respuestaDe(itemId: number): RespuestaChecklist | undefined {
    return this.respuestasPorItem.get(itemId);
  }

  setRespuesta(itemId: number, valor: RespuestaChecklist): void {
    this.respuestasPorItem.set(itemId, valor);
    this.cdr.markForCheck();
  }

  get puedeGuardarPetar(): boolean {
    const tipo = this.tipoSeleccionado;
    if (!tipo || !this.nuevaDescripcion.trim() || this.guardandoPetar) return false;
    if (tipo.items.length === 0) return true;
    return tipo.items.every((i) => !!this.respuestaDe(i.id));
  }

  guardarPetarGrupo(): void {
    if (!this.puedeGuardarPetar || !this.nuevoTipoId) return;

    const respuestasNo = this.tipoSeleccionado!.items.filter((i) => this.respuestaDe(i.id) === 'NO');
    if (respuestasNo.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Hay ítems marcados como NO cumplidos',
        text: 'El trabajo no puede iniciar hasta corregirlos — no se puede generar el PETAR así.',
      });
      return;
    }

    this.guardandoPetar = true;
    this.cdr.markForCheck();

    this.petarSvc.crearGrupo({
      atsGrupoId: this.id,
      tipoId: this.nuevoTipoId,
      descripcionTrabajo: this.nuevaDescripcion.trim(),
      lugar: this.nuevoLugar.trim() || undefined,
      horaInicio: this.nuevaHoraInicio || undefined,
      horaFin: this.nuevaHoraFin || undefined,
      respuestas: this.tipoSeleccionado!.items.map((i) => ({ itemId: i.id, respuesta: this.respuestaDe(i.id)! })),
    }).subscribe({
      next: () => {
        this.guardandoPetar = false;
        this.mostrarFormPetar = false;
        this.cargarPetares();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPetar = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirFirmaPetar(p: PetarGrupoEstadoDto, rol: 'Supervisor' | 'Ssoma'): void {
    this.petarFirmando = p;
    this.rolFirmando = rol;
    this.hayFirmaPetar = false;
    this.cdr.markForCheck();
  }

  cerrarFirmaPetar(): void {
    this.petarFirmando = null;
    this.rolFirmando = null;
    this.cdr.markForCheck();
  }

  onFirmaPetarChange(tieneTrazo: boolean): void {
    this.hayFirmaPetar = tieneTrazo;
  }

  guardarFirmaPetar(): void {
    const p = this.petarFirmando;
    if (!p || !this.rolFirmando || this.guardandoFirmaPetar) return;
    // La firma no se dibuja: el backend usa la firma digital registrada del usuario.
    const firma = '';

    this.guardandoFirmaPetar = true;
    this.cdr.markForCheck();

    const req$ = this.rolFirmando === 'Supervisor'
      ? this.petarSvc.firmarSupervisorGrupo(p.id, { firmaBase64: firma })
      : this.petarSvc.firmarSsomaGrupo(p.id, { firmaBase64: firma });

    req$.subscribe({
      next: () => {
        this.guardandoFirmaPetar = false;
        this.cerrarFirmaPetar();
        this.cargarPetares();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirmaPetar = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
