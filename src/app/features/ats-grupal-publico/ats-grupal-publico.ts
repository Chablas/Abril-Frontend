import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../ssoma/gestion/ats/services/ats.service';
import { AtsGrupoResumenPublicoDto, AtsGrupoWorkerOpcionDto } from '../ssoma/gestion/ats/dtos/ats.dtos';
import { PetarService } from '../ssoma/gestion/petar/services/petar.service';
import { PetarGrupoResumenPublicoDto } from '../ssoma/gestion/petar/dtos/petar.dtos';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { CameraCapture } from '../../shared/components/camera-capture/camera-capture';
import { SignaturePad } from '../../shared/components/signature-pad/signature-pad';

/**
 * Página PÚBLICA (sin login) que abre el QR de un ATS grupal — cada trabajador de la cuadrilla
 * la usa desde SU PROPIO celular para adherirse: confirma quién es (nombre de una lista acotada +
 * últimos dígitos de su DNI, fricción mínima contra "elegir cualquier nombre"), y firma con
 * selfie + geolocalización + firma, igual que el ATS individual — solo que sin repetir todo el
 * wizard de datos/pasos/peligros, que ya llenó el autor del grupo.
 */
@Component({
  selector: 'app-ats-grupal-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, CameraCapture, SignaturePad],
  templateUrl: './ats-grupal-publico.html',
  styleUrl: './ats-grupal-publico.css',
})
export class AtsGrupalPublico implements OnInit {
  token = '';
  cargando = true;
  resumen: AtsGrupoResumenPublicoDto | null = null;

  workers: AtsGrupoWorkerOpcionDto[] = [];
  workerId: number | null = null;
  dniConfirmacion = '';

  paso: 'resumen' | 'identidad' | 'firmar' | 'petares' | 'petar-firmar' | 'exito' = 'resumen';

  atsIdPropio: number | null = null;
  petares: PetarGrupoResumenPublicoDto[] = [];
  petaresSeleccionados = new Set<number>();
  petaresPendientesFirmar: PetarGrupoResumenPublicoDto[] = [];
  petarActual: PetarGrupoResumenPublicoDto | null = null;
  hayFirmaPetar = false;
  enviandoPetar = false;

  camaraLista = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;
  hayFirma = false;
  aceptaConsentimiento = false;
  enviando = false;
  nombreConfirmado = '';

  @ViewChild(CameraCapture) camara?: CameraCapture;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  /** Fecha/hora, proyecto/lugar y coordenadas "quemadas" sobre la selfie — mismo criterio que las
   *  apps de cámara con marca de tiempo. Sirve para la selfie del ATS y, reusado tal cual, para
   *  la de cada PETAR que firme a continuación. */
  get selfieOverlayLineas(): string[] {
    const lineas = [new Date().toLocaleString('es-PE'), this.nombreConfirmado].filter(Boolean) as string[];
    const proyecto = this.resumen?.proyectoNombre;
    if (proyecto) lineas.push(proyecto);
    if (this.resumen?.torreNombre) lineas.push(`Torre ${this.resumen.torreNombre}`);
    else if (this.resumen?.lugar) lineas.push(this.resumen.lugar);
    if (this.gpsCoords) lineas.push(`${this.gpsCoords.latitude.toFixed(5)}, ${this.gpsCoords.longitude.toFixed(5)}`);
    return lineas;
  }

  get petarOverlayLineas(): string[] {
    const lineas = this.selfieOverlayLineas.slice();
    if (this.petarActual?.tipoNombre) lineas.splice(1, 0, `PETAR: ${this.petarActual.tipoNombre}`);
    return lineas;
  }

  constructor(
    private svc: AtsService,
    private petarSvc: PetarService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.svc.getResumenPublico(this.token).subscribe({
      next: (res) => {
        this.resumen = res;
        this.cargando = false;
        this.cdr.detectChanges();
        if (res.valido) this.cargarWorkers();
      },
      error: () => {
        this.resumen = { valido: false, motivoInvalido: 'No se pudo cargar este enlace. Intenta de nuevo.', epps: [], herramientas: [], riesgos: [] };
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarWorkers(): void {
    this.svc.getWorkersParaAdhesion(this.token).subscribe({
      next: (res) => { this.workers = res; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  irAIdentidad(): void {
    this.paso = 'identidad';
    this.cdr.detectChanges();
  }

  get puedeContinuarIdentidad(): boolean {
    return !!this.workerId && this.dniConfirmacion.trim().length >= 3;
  }

  irAFirmar(): void {
    if (!this.puedeContinuarIdentidad) return;
    this.nombreConfirmado = this.workers.find((w) => w.workerId === this.workerId)?.nombre ?? '';
    this.paso = 'firmar';
    this.cdr.detectChanges();
    this.pedirUbicacion();
  }

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
    return this.camaraLista && this.hayFirma && this.aceptaConsentimiento && !this.enviando;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.camara || !this.workerId) return;

    const foto = this.camara.capturarFoto();
    const firma = this.firmaPad?.toDataUrl();
    if (!foto) {
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la selfie', text: 'Intenta de nuevo.' });
      return;
    }
    if (!firma) {
      Swal.fire({ icon: 'error', title: 'Falta la firma', text: 'Dibuja tu firma antes de continuar.' });
      return;
    }

    this.enviando = true;
    this.cdr.detectChanges();

    this.svc.unirseAGrupo(this.token, {
      workerId: this.workerId,
      dniConfirmacion: this.dniConfirmacion.trim(),
      selfieBase64: foto,
      firmaBase64: firma,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
      aceptaConsentimiento: this.aceptaConsentimiento,
    }).subscribe({
      next: (res) => {
        this.enviando = false;
        this.atsIdPropio = res.id;
        this.cargarPetares();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo firmar', text: err.error?.message ?? 'Intenta de nuevo.' });
        this.cdr.detectChanges();
      },
    });
  }

  private cargarPetares(): void {
    this.petarSvc.getGruposPublicoPorAtsToken(this.token).subscribe({
      next: (res) => {
        this.petares = res;
        this.paso = res.length > 0 ? 'petares' : 'exito';
        this.cdr.detectChanges();
      },
      error: () => {
        this.paso = 'exito';
        this.cdr.detectChanges();
      },
    });
  }

  togglePetarSeleccionado(id: number): void {
    if (this.petaresSeleccionados.has(id)) this.petaresSeleccionados.delete(id);
    else this.petaresSeleccionados.add(id);
    this.cdr.detectChanges();
  }

  /** Ninguno de estos trabajos de alto riesgo le aplica a este trabajador — sigue directo a éxito. */
  omitirPetares(): void {
    this.paso = 'exito';
    this.cdr.detectChanges();
  }

  confirmarPetaresSeleccionados(): void {
    this.petaresPendientesFirmar = this.petares.filter((p) => this.petaresSeleccionados.has(p.id));
    if (this.petaresPendientesFirmar.length === 0) { this.omitirPetares(); return; }
    this.siguientePetar();
  }

  private siguientePetar(): void {
    this.petarActual = this.petaresPendientesFirmar.shift() ?? null;
    if (!this.petarActual) { this.paso = 'exito'; this.cdr.detectChanges(); return; }
    this.hayFirmaPetar = false;
    this.paso = 'petar-firmar';
    this.cdr.detectChanges();
  }

  onFirmaPetarChange(tieneTrazo: boolean): void {
    this.hayFirmaPetar = tieneTrazo;
  }

  get puedeFirmarPetar(): boolean {
    return this.hayFirmaPetar && !this.enviandoPetar;
  }

  firmarPetarActual(): void {
    if (!this.puedeFirmarPetar || !this.camara || !this.petarActual || !this.workerId || !this.atsIdPropio) return;

    const foto = this.camara.capturarFoto();
    const firma = this.firmaPad?.toDataUrl();
    if (!foto || !firma) {
      Swal.fire({ icon: 'error', title: 'Falta selfie o firma', text: 'Completa ambas antes de continuar.' });
      return;
    }

    this.enviandoPetar = true;
    this.cdr.detectChanges();

    this.petarSvc.unirseAGrupo(this.petarActual.id, {
      atsToken: this.token,
      workerId: this.workerId,
      atsIdPropio: this.atsIdPropio,
      selfieBase64: foto,
      firmaBase64: firma,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
    }).subscribe({
      next: () => {
        this.enviandoPetar = false;
        this.siguientePetar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoPetar = false;
        Swal.fire({ icon: 'error', title: 'No se pudo firmar el PETAR', text: err.error?.message ?? 'Intenta de nuevo.' });
        this.cdr.detectChanges();
      },
    });
  }

  firmarOtro(): void {
    this.workerId = null;
    this.dniConfirmacion = '';
    this.camaraLista = false;
    this.hayFirma = false;
    this.aceptaConsentimiento = false;
    this.atsIdPropio = null;
    this.petares = [];
    this.petaresSeleccionados.clear();
    this.petaresPendientesFirmar = [];
    this.petarActual = null;
    this.paso = 'identidad';
    this.cdr.detectChanges();
  }
}
