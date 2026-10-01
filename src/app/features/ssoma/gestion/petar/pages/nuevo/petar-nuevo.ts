import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PetarService } from '../../services/petar.service';
import { AtsService } from '../../../ats/services/ats.service';
import { PetarInitDto, PetarIzajeGruaDto, PetarTipoDto, RespuestaChecklist } from '../../dtos/petar.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { CameraCapture } from '../../../../../../shared/components/camera-capture/camera-capture';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';

@Component({
  selector: 'app-petar-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel, CameraCapture, SignaturePad],
  templateUrl: './petar-nuevo.html',
  styleUrl: './petar-nuevo.css',
})
export class PetarNuevo implements OnInit {
  readonly pasoLabels = ['Datos y checklist', 'Firmar'];
  paso = 1;

  atsId!: number;
  loadingInit = true;
  init: PetarInitDto | null = null;
  saving = false;
  petarId: number | null = null;

  tipoId: number | null = null;
  descripcionTrabajo = '';
  lugar = '';
  horaInicio = '';
  horaFin = '';
  respuestas = new Map<number, RespuestaChecklist>();

  izajeGrua: PetarIzajeGruaDto = {};

  camaraLista = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;
  hayFirma = false;
  firmando = false;

  /** Misma firma autorizada que ya se captura una vez en ATS → Autorizaciones — se reutiliza
   *  acá para no obligar a redibujar en cada PETAR. */
  firmaAutorizadaDataUrl: string | null = null;
  usandoFirmaAutorizada = false;

  @ViewChild(CameraCapture) camara?: CameraCapture;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  /** Fecha/hora, lugar y coordenadas "quemadas" sobre la selfie — mismo criterio que las apps de
   *  cámara con marca de tiempo. La ubicación puede llegar después de que la cámara ya esté lista,
   *  por eso es un getter (se recalcula cada vez que Angular repinta, no un valor fijo). */
  get selfieOverlayLineas(): string[] {
    const lineas = [new Date().toLocaleString('es-PE')];
    if (this.lugar.trim()) lineas.push(this.lugar.trim());
    if (this.gpsCoords) lineas.push(`${this.gpsCoords.latitude.toFixed(5)}, ${this.gpsCoords.longitude.toFixed(5)}`);
    return lineas;
  }

  constructor(
    private svc: PetarService,
    private atsSvc: AtsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const petarIdParam = this.route.snapshot.queryParamMap.get('petarId');
    if (petarIdParam) {
      this.continuarPetarExistente(Number(petarIdParam));
      return;
    }

    const atsIdParam = this.route.snapshot.queryParamMap.get('atsId');
    if (!atsIdParam) {
      Swal.fire({ icon: 'error', title: 'Falta el ATS de origen', text: 'El PETAR siempre se genera desde un ATS ya firmado.' })
        .then(() => this.router.navigate(['/ssoma/gestion/ats']));
      return;
    }
    this.atsId = Number(atsIdParam);

    this.svc.getInit(this.atsId).subscribe({
      next: (data) => {
        this.init = data;
        this.lugar = data.atsLugar ?? '';
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

  /** ?petarId=id — el checklist (paso 1) ya se guardó cuando se generó el PETAR; acá solo falta
   *  la firma del ejecutante (paso 2), así que se salta directo ahí en vez de reiniciar todo. */
  private continuarPetarExistente(petarId: number): void {
    this.svc.getPorId(petarId).subscribe({
      next: (p) => {
        this.petarId = p.id;
        this.atsId = p.atsId;
        // El template gatea todo detrás de "init" — acá no hace falta el catálogo de tipos
        // (paso 1 ya quedó guardado), solo que no sea null para que el paso 2 se muestre.
        this.init = { atsId: p.atsId, atsActividad: p.descripcionTrabajo, tipos: [] };
        this.loadingInit = false;
        this.paso = 2;
        this.pedirUbicacion();
        this.cargarFirmaAutorizada();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInit = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get tiposOpts(): { id: number; nombre: string }[] {
    return (this.init?.tipos ?? []).map((t) => ({
      id: t.id,
      nombre: t.codigo ? `${t.nombre} (${t.codigo})` : t.nombre,
    }));
  }

  get tipoSeleccionado(): PetarTipoDto | undefined {
    return this.init?.tipos.find((t) => t.id === this.tipoId);
  }

  get esIzajeConGrua(): boolean {
    return this.tipoSeleccionado?.codigo === 'SSO-FO-043';
  }

  onTipoChange(tipoId: number | null): void {
    this.tipoId = tipoId;
    this.respuestas.clear();
    this.cdr.markForCheck();
  }

  respuestaDe(itemId: number): RespuestaChecklist | null {
    return this.respuestas.get(itemId) ?? null;
  }

  setRespuesta(itemId: number, r: RespuestaChecklist): void {
    this.respuestas.set(itemId, r);
    this.cdr.markForCheck();
  }

  get datosValidos(): boolean {
    if (!this.tipoId || !this.descripcionTrabajo.trim()) return false;
    const items = this.tipoSeleccionado?.items ?? [];
    if (items.length === 0) return false;
    return items.every((i) => this.respuestas.has(i.id));
  }

  get hayNoCumplidos(): boolean {
    return Array.from(this.respuestas.values()).includes('NO');
  }

  siguiente(): void {
    if (!this.datosValidos || this.saving) return;
    if (this.hayNoCumplidos) {
      Swal.fire({
        icon: 'warning',
        title: 'Hay ítems marcados como NO',
        text: 'El trabajo de alto riesgo no puede iniciar hasta corregir todo lo marcado como NO en el checklist.',
      });
      return;
    }

    this.saving = true;
    this.loaderService.show();

    const dto = {
      atsId: this.atsId,
      tipoId: this.tipoId!,
      descripcionTrabajo: this.descripcionTrabajo.trim(),
      lugar: this.lugar.trim() || undefined,
      horaInicio: this.horaInicio || undefined,
      horaFin: this.horaFin || undefined,
      respuestas: Array.from(this.respuestas.entries()).map(([itemId, respuesta]) => ({ itemId, respuesta })),
      izajeGrua: this.esIzajeConGrua ? this.izajeGrua : undefined,
    };

    const alGuardar = () => {
      this.saving = false;
      this.loaderService.hide();
      this.paso = 2;
      this.pedirUbicacion();
      this.cargarFirmaAutorizada();
      this.cdr.detectChanges();
    };
    const alFallar = (err: HttpErrorResponse) => {
      this.saving = false;
      this.loaderService.hide();
      this.errorService.handleError(err);
      this.cdr.detectChanges();
    };

    if (this.petarId) {
      this.svc.editar(this.petarId, dto).subscribe({ next: alGuardar, error: alFallar });
    } else {
      this.svc.crear(dto).subscribe({
        next: (res) => { this.petarId = res.id; alGuardar(); },
        error: alFallar,
      });
    }
  }

  volver(): void {
    this.paso = 1;
    this.cdr.markForCheck();
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

  private cargarFirmaAutorizada(): void {
    this.atsSvc.getMiFirmaDigitalAutorizacionImagenBlob().subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.firmaAutorizadaDataUrl = typeof reader.result === 'string' ? reader.result : null;
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(blob);
      },
      // 404 = todavía no capturó su firma digital autorizada — sigue el flujo de dibujar a mano.
      error: () => this.cdr.detectChanges(),
    });
  }

  usarFirmaAutorizada(): void {
    if (!this.firmaAutorizadaDataUrl) return;
    this.usandoFirmaAutorizada = true;
  }

  dibujarFirmaNueva(): void {
    this.usandoFirmaAutorizada = false;
    this.firmaPad?.clear();
  }

  get puedeFirmar(): boolean {
    return this.camaraLista && !!this.firmaAutorizadaDataUrl && !this.firmando;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.petarId || !this.camara) return;

    const foto = this.camara.capturarFoto();
    if (!foto) {
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la selfie', text: 'Intenta de nuevo.' });
      return;
    }
    // La firma no se dibuja: el backend usa la firma digital registrada del trabajador.
    const firma = '';

    this.firmando = true;
    this.loaderService.show();

    this.svc.firmar(this.petarId, {
      selfieBase64: foto,
      firmaBase64: firma,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
    }).subscribe({
      next: () => {
        this.firmando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'PETAR firmado',
          text: 'Queda pendiente la firma del Supervisor y el Visto Bueno de SSOMA antes de poder iniciar el trabajo.',
          timer: 3000,
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
    this.router.navigate(['/ssoma/gestion/petar']);
  }
}
