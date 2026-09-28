import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../../services/ats.service';
import {
  AtsInitDto,
  AtsPeligroDto,
  AtsRiesgoDto,
  AtsGuardarRequestDto,
  NivelRiesgo,
} from '../../dtos/ats.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { CameraCapture } from '../../../../../../shared/components/camera-capture/camera-capture';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';

interface RiesgoSeleccionado {
  peligroId: number;
  riesgoId: number;
  peligroNombre: string;
  riesgoNombre: string;
  riesgoBase: NivelRiesgo | '';
  controles: string;
  riesgoResidual: NivelRiesgo | '';
}

const NIVELES: { valor: NivelRiesgo; label: string }[] = [
  { valor: 'A', label: 'Alto' },
  { valor: 'M', label: 'Medio' },
  { valor: 'B', label: 'Bajo' },
];

@Component({
  selector: 'app-ats-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel, CameraCapture, SignaturePad],
  templateUrl: './ats-nuevo.html',
  styleUrl: './ats-nuevo.css',
})
export class AtsNuevo implements OnInit {
  readonly pasoLabels = ['Datos y pasos', 'Peligros y riesgos', 'Valoración', 'Firmar'];
  readonly niveles = NIVELES;
  paso = 1;

  // Input de "+ agregar paso personalizado", uno por categoría
  nuevoPasoTexto = new Map<number, string>();
  agregandoPasoCategoriaId: number | null = null;

  loadingInit = true;
  init: AtsInitDto | null = null;
  saving = false;
  atsId: number | null = null;

  /** true = el Coordinador SSOMA aún no sube la autorización firmada de uso de firma digital e
   *  imagen de este trabajador — se bloquea ANTES de cargar el wizard (el backend igual lo
   *  valida en Crear/Editar, esto solo evita que llene todo el formulario para recién enterarse). */
  bloqueadoSinAutorizacion = false;

  // Paso 1 — datos
  proyectoId: number | null = null;
  plantillaId: number | null = null;
  actividad = '';
  lugar = '';

  pasosMarcados = new Map<number, boolean>();
  eppsMarcados = new Set<number>();
  herramientasMarcadas = new Set<number>();
  riesgosSeleccionados: RiesgoSeleccionado[] = [];

  // Paso 2 — firma
  camaraLista = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;
  hayFirma = false;
  aceptaConsentimiento = false;
  firmando = false;

  @ViewChild(CameraCapture) camara?: CameraCapture;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  constructor(
    private svc: AtsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.svc.getMiAutorizacion().subscribe({
      next: ({ tieneAutorizacion }) => {
        if (!tieneAutorizacion) {
          this.bloqueadoSinAutorizacion = true;
          this.loadingInit = false;
          this.cdr.detectChanges();
          return;
        }
        this.cargarInit();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInit = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private cargarInit(): void {
    this.svc.getInit().subscribe({
      next: (data) => {
        this.init = data;
        this.proyectoId = data.proyectoActualId ?? null;
        this.plantillaId = data.plantillaSugeridaId ?? null;
        this.aceptaConsentimiento = data.tieneConsentimiento;
        this.loadingInit = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInit = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get proyectosOpts(): { id: number; nombre: string }[] {
    return (this.init?.proyectos ?? []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get plantillasOpts(): { id: number; nombre: string }[] {
    return this.init?.plantillas ?? [];
  }

  // ── Pasos (SI/NO por categoría) ───────────────────────────────────────

  pasoAplica(pasoId: number): boolean {
    return this.pasosMarcados.get(pasoId) ?? false;
  }

  togglePaso(pasoId: number): void {
    this.pasosMarcados.set(pasoId, !this.pasoAplica(pasoId));
  }

  /** true cuando TODOS los pasos de esta categoría ya están marcados — controla el estado
   *  (marcado/indeterminado) del checkbox "Marcar todos" de la categoría. */
  todosMarcadosEnCategoria(pasos: { id: number }[]): boolean {
    return pasos.length > 0 && pasos.every((p) => this.pasoAplica(p.id));
  }

  toggleTodosCategoria(pasos: { id: number }[]): void {
    const marcarTodos = !this.todosMarcadosEnCategoria(pasos);
    pasos.forEach((p) => this.pasosMarcados.set(p.id, marcarTodos));
  }

  nuevoPasoTextoDe(categoriaId: number): string {
    return this.nuevoPasoTexto.get(categoriaId) ?? '';
  }

  setNuevoPasoTexto(categoriaId: number, valor: string): void {
    this.nuevoPasoTexto.set(categoriaId, valor);
  }

  agregarPasoPersonalizado(categoriaId: number): void {
    const texto = (this.nuevoPasoTexto.get(categoriaId) ?? '').trim();
    if (!texto || !this.init) return;

    this.agregandoPasoCategoriaId = categoriaId;
    this.svc.crearPaso(categoriaId, texto).subscribe({
      next: (paso) => {
        const cat = this.init!.pasos.find((c) => c.id === categoriaId);
        if (cat) cat.pasos.push(paso);
        this.pasosMarcados.set(paso.id, true);
        this.nuevoPasoTexto.set(categoriaId, '');
        this.agregandoPasoCategoriaId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.agregandoPasoCategoriaId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── EPP / Herramientas ────────────────────────────────────────────────

  eppSeleccionado(id: number): boolean {
    return this.eppsMarcados.has(id);
  }

  toggleEpp(id: number): void {
    if (this.eppsMarcados.has(id)) this.eppsMarcados.delete(id);
    else this.eppsMarcados.add(id);
  }

  herramientaSeleccionada(id: number): boolean {
    return this.herramientasMarcadas.has(id);
  }

  toggleHerramienta(id: number): void {
    if (this.herramientasMarcadas.has(id)) this.herramientasMarcadas.delete(id);
    else this.herramientasMarcadas.add(id);
  }

  get herramientasPorCategoria(): { categoria: string; items: { id: number; nombre: string }[] }[] {
    const grupos = new Map<string, { id: number; nombre: string }[]>();
    for (const h of this.init?.herramientas ?? []) {
      if (!grupos.has(h.categoria)) grupos.set(h.categoria, []);
      grupos.get(h.categoria)!.push({ id: h.id, nombre: h.nombre });
    }
    return Array.from(grupos.entries()).map(([categoria, items]) => ({ categoria, items }));
  }

  // ── Plantilla: aplica EPP/herramientas sugeridos, no fuerza riesgos ──

  onPlantillaChange(plantillaId: number | null): void {
    this.plantillaId = plantillaId;
    const plantilla = this.init?.plantillas.find((p) => p.id === plantillaId);
    if (!plantilla) return;
    plantilla.eppIds.forEach((id) => this.eppsMarcados.add(id));
    plantilla.herramientaIds.forEach((id) => this.herramientasMarcadas.add(id));
    this.cdr.markForCheck();
  }

  peligroSugeridoPorPlantilla(peligroId: number): boolean {
    const plantilla = this.init?.plantillas.find((p) => p.id === this.plantillaId);
    return plantilla?.peligroIds.includes(peligroId) ?? false;
  }

  // ── Peligros / Riesgos (matriz IPERC) ────────────────────────────────

  riesgoEstaSeleccionado(riesgoId: number): boolean {
    return this.riesgosSeleccionados.some((r) => r.riesgoId === riesgoId);
  }

  toggleRiesgo(peligro: AtsPeligroDto, riesgo: AtsRiesgoDto): void {
    const idx = this.riesgosSeleccionados.findIndex((r) => r.riesgoId === riesgo.id);
    if (idx >= 0) {
      this.riesgosSeleccionados.splice(idx, 1);
    } else {
      this.riesgosSeleccionados.push({
        peligroId: peligro.id,
        riesgoId: riesgo.id,
        peligroNombre: peligro.nombre,
        riesgoNombre: riesgo.nombre,
        riesgoBase: '',
        controles: '',
        riesgoResidual: '',
      });
    }
    this.cdr.markForCheck();
  }

  // ── Validación por paso ────────────────────────────────────────────────

  get datosBasicosValidos(): boolean {
    return !!(this.proyectoId && this.actividad.trim());
  }

  get riesgosValidos(): boolean {
    return this.riesgosSeleccionados.length > 0;
  }

  get valoracionValida(): boolean {
    return this.riesgosSeleccionados.every((r) => r.riesgoBase && r.controles.trim() && r.riesgoResidual);
  }

  irAPeligros(): void {
    if (!this.datosBasicosValidos) return;
    this.paso = 2;
    this.cdr.markForCheck();
  }

  irAValoracion(): void {
    if (!this.riesgosValidos) return;
    this.paso = 3;
    this.cdr.markForCheck();
  }

  volverAPaso(n: number): void {
    this.paso = n;
    this.cdr.markForCheck();
  }

  private buildDto(): AtsGuardarRequestDto {
    return {
      proyectoId: this.proyectoId!,
      plantillaId: this.plantillaId ?? undefined,
      actividad: this.actividad.trim(),
      lugar: this.lugar.trim() || undefined,
      pasos: Array.from(this.pasosMarcados.entries()).map(([pasoId, aplica]) => ({ pasoId, aplica })),
      eppIds: Array.from(this.eppsMarcados),
      herramientaIds: Array.from(this.herramientasMarcadas),
      riesgos: this.riesgosSeleccionados.map((r) => ({
        peligroId: r.peligroId,
        riesgoId: r.riesgoId,
        riesgoBase: r.riesgoBase as NivelRiesgo,
        controles: r.controles.trim(),
        riesgoResidual: r.riesgoResidual as NivelRiesgo,
      })),
    };
  }

  siguiente(): void {
    if (!this.valoracionValida || this.saving) return;
    this.saving = true;
    this.loaderService.show();

    const dto = this.buildDto();

    const alGuardar = () => {
      this.saving = false;
      this.loaderService.hide();
      this.paso = 4;
      this.pedirUbicacion();
      this.cdr.detectChanges();
    };
    const alFallar = (err: HttpErrorResponse) => {
      this.saving = false;
      this.loaderService.hide();
      this.errorService.handleError(err);
      this.cdr.detectChanges();
    };

    // editar()/crear() devuelven Observables de tipos distintos ({message}/{id}); separarlos
    // en dos subscribe evita unir esos tipos en uno solo (rompía la sobrecarga de subscribe).
    if (this.atsId) {
      this.svc.editar(this.atsId, dto).subscribe({ next: alGuardar, error: alFallar });
    } else {
      this.svc.crear(dto).subscribe({
        next: (res) => {
          this.atsId = res.id;
          alGuardar();
        },
        error: alFallar,
      });
    }
  }

  volver(): void {
    this.paso = 3;
    this.cdr.markForCheck();
  }

  // ── Paso 2: geolocalización, cámara, firma ───────────────────────

  private pedirUbicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.gpsEstado = 'error';
      this.cdr.detectChanges();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.gpsCoords = pos.coords; this.gpsEstado = 'ok'; this.cdr.detectChanges(); },
      () => { this.gpsEstado = 'error'; this.cdr.detectChanges(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  onCamaraLista(): void {
    this.camaraLista = true;
    this.cdr.detectChanges();
  }

  onFirmaChange(tieneTrazo: boolean): void {
    this.hayFirma = tieneTrazo;
  }

  get puedeFirmar(): boolean {
    return this.camaraLista && this.hayFirma && this.aceptaConsentimiento && !this.firmando;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.atsId || !this.camara || !this.firmaPad) return;

    const foto = this.camara.capturarFoto();
    const firma = this.firmaPad.toDataUrl();
    if (!foto) {
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la selfie', text: 'Intenta de nuevo.' });
      return;
    }
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.firmando = true;
    this.loaderService.show();

    this.svc.firmar(this.atsId, {
      selfieBase64: foto,
      firmaBase64: firma,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
      aceptaConsentimiento: this.aceptaConsentimiento,
    }).subscribe({
      next: () => {
        this.firmando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'ATS firmado',
          text: 'Tu Análisis de Trabajo Seguro quedó registrado con firma y geolocalización.',
          timer: 2500,
          showConfirmButton: false,
        }).then(() => this.cerrar());
      },
      error: (err: HttpErrorResponse) => {
        this.firmando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cerrar(): void {
    this.router.navigate(['/ssoma/gestion/ats']);
  }
}
