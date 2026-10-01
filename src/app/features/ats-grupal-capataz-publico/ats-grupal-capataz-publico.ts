import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../ssoma/gestion/ats/services/ats.service';
import { AtsGrupoCapatazPublicoDto } from '../ssoma/gestion/ats/dtos/ats.dtos';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { SignaturePad } from '../../shared/components/signature-pad/signature-pad';
import { CameraCapture } from '../../shared/components/camera-capture/camera-capture';

/**
 * Página PÚBLICA (sin login) del Capataz/Maestro de obra: firma UNA vez por cuadrilla, después de
 * que los trabajadores ya adhirieron. Si luego se suma alguien, la firma queda pendiente y el
 * capataz vuelve a entrar con el mismo link a firmar de nuevo (ve cuántos nuevos hay).
 * Se identifica igual que la adhesión: nombre de una lista acotada (solo capataces/maestros de
 * obra del proyecto) + últimos dígitos de su DNI.
 */
@Component({
  selector: 'app-ats-grupal-capataz-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, SignaturePad, CameraCapture],
  templateUrl: './ats-grupal-capataz-publico.html',
  styleUrl: './ats-grupal-capataz-publico.css',
})
export class AtsGrupalCapatazPublico implements OnInit {
  token = '';
  cargando = true;
  datos: AtsGrupoCapatazPublicoDto | null = null;

  workerId: number | null = null;
  dniConfirmacion = '';
  hayFirma = false;
  enviando = false;
  firmado = false;

  camaraLista = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;

  @ViewChild(SignaturePad) firmaPad?: SignaturePad;
  @ViewChild(CameraCapture) camara?: CameraCapture;

  get selfieOverlayLineas(): string[] {
    const nombre = this.datos?.capataces.find((c) => c.workerId === this.workerId)?.nombre;
    const lineas = [new Date().toLocaleString('es-PE'), nombre, this.datos?.proyectoNombre].filter(Boolean) as string[];
    if (this.gpsCoords) lineas.push(`${this.gpsCoords.latitude.toFixed(5)}, ${this.gpsCoords.longitude.toFixed(5)}`);
    return lineas;
  }

  constructor(
    private svc: AtsService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.cargar();
    this.pedirUbicacion();
  }

  private pedirUbicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { this.gpsEstado = 'error'; return; }
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

  private cargar(): void {
    this.svc.getCapatazPublico(this.token).subscribe({
      next: (res) => { this.datos = res; this.cargando = false; this.cdr.detectChanges(); },
      error: () => {
        this.datos = { valido: false, motivoInvalido: 'No se pudo cargar este enlace. Intenta de nuevo.', trabajadoresAdheridos: [], yaFirmo: false, vigente: false, nuevosSinValidar: 0, capataces: [] };
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get yaVigente(): boolean {
    return !!this.datos?.yaFirmo && !!this.datos?.vigente;
  }

  get puedeFirmar(): boolean {
    return !!this.workerId && this.dniConfirmacion.trim().length >= 3 && this.hayFirma && this.camaraLista && !this.enviando
      && (this.datos?.trabajadoresAdheridos.length ?? 0) > 0;
  }

  onFirmaChange(tieneTrazo: boolean): void {
    this.hayFirma = tieneTrazo;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.workerId) return;
    const firma = this.firmaPad?.toDataUrl();
    const foto = this.camara?.capturarFoto();
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

    this.svc.firmarCapatazPublico(this.token, {
      workerId: this.workerId,
      dniConfirmacion: this.dniConfirmacion.trim(),
      firmaBase64: firma,
      selfieBase64: foto,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
    }).subscribe({
      next: () => { this.enviando = false; this.firmado = true; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo firmar', text: err.error?.message ?? 'Intenta de nuevo.' });
        this.cdr.detectChanges();
      },
    });
  }
}
