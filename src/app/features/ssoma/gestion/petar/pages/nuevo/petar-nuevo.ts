import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PetarService } from '../../services/petar.service';
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

  @ViewChild(CameraCapture) camara?: CameraCapture;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  constructor(
    private svc: PetarService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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

  get puedeFirmar(): boolean {
    return this.camaraLista && this.hayFirma && !this.firmando;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.petarId || !this.camara || !this.firmaPad) return;

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
