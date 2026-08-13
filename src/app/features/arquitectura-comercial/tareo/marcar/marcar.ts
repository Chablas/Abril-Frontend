import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { CameraCapture } from '../../../../shared/components/camera-capture/camera-capture';
import { TareoService } from '../../../../core/services/arquitectura-comercial/tareo.service';
import { FaceRecognitionService } from '../../../../core/services/arquitectura-comercial/face-recognition.service';
import { AC_TAREO_TABS } from '../../shared/arquitectura-comercial-tabs';
import {
  TareoTipo,
  TareoMiTareoHoyDTO,
  TareoRegistroDTO,
  TAREO_TIPO_LABEL,
} from '../../../../core/dtos/arquitectura-comercial/tareo.model';

interface PasoTareo {
  tipo: TareoTipo;
  label: string;
  icono: string;
}

const PASOS: PasoTareo[] = [
  { tipo: 'INICIO_JORNADA', label: 'Inicio de jornada', icono: 'ti-sunrise' },
  { tipo: 'INICIO_ALMUERZO', label: 'Inicio de almuerzo', icono: 'ti-soup' },
  { tipo: 'RETORNO', label: 'Retorno de almuerzo', icono: 'ti-door-enter' },
  { tipo: 'FIN_JORNADA', label: 'Fin de jornada', icono: 'ti-moon' },
];

@Component({
  selector: 'app-tareo-marcar',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, CameraCapture],
  templateUrl: './marcar.html',
  styleUrl: './marcar.css',
})
export class TareoMarcar {
  readonly tabs = AC_TAREO_TABS;
  readonly pasos = PASOS;
  readonly TAREO_TIPO_LABEL = TAREO_TIPO_LABEL;

  cargando = true;
  hoy: TareoMiTareoHoyDTO | null = null;
  enrolado: boolean | null = null;

  capturaAbierta = false;
  pasoActivo: PasoTareo | null = null;
  procesando = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;

  @ViewChild(CameraCapture) camara?: CameraCapture;

  constructor(
    private tareoService: TareoService,
    private faceService: FaceRecognitionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.faceService.cargarModelos();
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.tareoService.getMiTareoHoy().subscribe({
      next: (r) => { this.hoy = r; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; this.cdr.detectChanges(); },
    });
    this.tareoService.getEnrolamientoEstado().subscribe({
      next: (r) => { this.enrolado = r.enrolado; this.cdr.detectChanges(); },
      error: () => { this.enrolado = null; },
    });
  }

  registroDe(tipo: TareoTipo): TareoRegistroDTO | null {
    if (!this.hoy) return null;
    switch (tipo) {
      case 'INICIO_JORNADA': return this.hoy.inicioJornada;
      case 'INICIO_ALMUERZO': return this.hoy.inicioAlmuerzo;
      case 'RETORNO': return this.hoy.retorno;
      case 'FIN_JORNADA': return this.hoy.finJornada;
    }
  }

  /** Solo el siguiente paso pendiente está habilitado — evita marcar fuera de orden por error. */
  esSiguientePendiente(tipo: TareoTipo): boolean {
    const idx = PASOS.findIndex((p) => p.tipo === tipo);
    for (let i = 0; i < idx; i++) {
      if (!this.registroDe(PASOS[i].tipo)) return false;
    }
    return !this.registroDe(tipo);
  }

  abrirCaptura(paso: PasoTareo): void {
    if (!this.esSiguientePendiente(paso.tipo)) return;
    this.pasoActivo = paso;
    this.capturaAbierta = true;
    this.gpsEstado = 'buscando';
    this.gpsCoords = null;
    this.pedirUbicacion();
  }

  cerrarCaptura(): void {
    this.camara?.detener();
    this.capturaAbierta = false;
    this.pasoActivo = null;
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

  async confirmarMarcado(): Promise<void> {
    if (!this.pasoActivo || !this.camara || this.procesando) return;
    this.procesando = true;
    this.cdr.detectChanges();

    const foto = this.camara.capturarFoto();
    if (!foto) {
      this.procesando = false;
      this.cdr.detectChanges();
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la foto', text: 'Intenta de nuevo.' });
      return;
    }

    // El embedding es "mejor esfuerzo": si no se calcula (modelos no cargaron, sin cara clara), el
    // marcado se guarda igual — el backend lo deja en REVISAR, nunca bloquea al trabajador.
    const embedding = this.faceService.disponible()
      ? await this.faceService.calcularEmbedding(this.camara.videoElement)
      : null;

    const idempotencyKey = crypto.randomUUID();
    const tipo = this.pasoActivo.tipo;

    this.tareoService
      .marcar(
        {
          tipo,
          fotoBase64: foto,
          embedding,
          horaDispositivo: new Date().toISOString(),
          lat: this.gpsCoords?.latitude ?? null,
          lng: this.gpsCoords?.longitude ?? null,
          precisionMetros: this.gpsCoords?.accuracy ?? null,
        },
        idempotencyKey,
      )
      .subscribe({
        next: (registro) => {
          this.procesando = false;
          this.cerrarCaptura();
          this.cargar();
          const ok = registro.estado === 'VERIFICADO';
          Swal.fire({
            icon: ok ? 'success' : 'info',
            title: `${TAREO_TIPO_LABEL[tipo]} registrado`,
            text: ok
              ? undefined
              : 'Tu hora quedó guardada. Un supervisor revisará el registro (' + (registro.motivoRevision ?? 'verificación pendiente') + ').',
            timer: ok ? 1800 : undefined,
            showConfirmButton: !ok,
          });
        },
        error: (err) => {
          this.procesando = false;
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: err?.error?.message ?? 'Intenta de nuevo.' });
        },
      });
  }

  irAEnrolar(): void {
    this.router.navigateByUrl('/arquitectura-comercial/tareo/enrolamiento');
  }
}
