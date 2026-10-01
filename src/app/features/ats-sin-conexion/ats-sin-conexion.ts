import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsOfflineService } from '../ssoma/gestion/ats/services/ats-offline.service';
import { AdhesionOffline, PaqueteOffline } from '../ssoma/gestion/ats/services/ats-offline.models';
import { AtsGrupoProyectoPublicoDto, AtsGrupoWorkerOpcionDto } from '../ssoma/gestion/ats/dtos/ats.dtos';
import { AtsService } from '../ssoma/gestion/ats/services/ats.service';
import { OfflineStore } from '../../core/services/offline-store.service';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { CameraCapture } from '../../shared/components/camera-capture/camera-capture';

/**
 * PÚBLICA (sin login), pensada para el celular de la cuadrilla en obra: lista los ATS grupales armados SIN señal,
 * permite registrar la firma de cada integrante (selfie + GPS + hora del dispositivo) y los sube cuando alguien
 * llega a un lugar con internet. La firma (imagen) la aplica el servidor con la firma digital registrada de cada
 * trabajador al sincronizar; aquí se guarda la evidencia de presencia y la hora real en que firmó.
 */
@Component({
  selector: 'app-ats-sin-conexion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SearchSelect, CameraCapture],
  templateUrl: './ats-sin-conexion.html',
  styleUrl: './ats-sin-conexion.css',
})
export class AtsSinConexion implements OnInit {
  paquetes: PaqueteOffline[] = [];
  actual: PaqueteOffline | null = null;
  enLinea = true;
  cargando = true;

  workers: AtsGrupoWorkerOpcionDto[] = [];

  // Captura de un firmante
  capturando = false;
  workerId: number | null = null;
  dni = '';
  acepta = false;
  camaraLista = false;
  guardando = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;

  sincronizando = false;

  @ViewChild(CameraCapture) camara?: CameraCapture;

  constructor(
    private offline: AtsOfflineService,
    private svc: AtsService,
    private store: OfflineStore,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.enLinea = this.offline.enLinea;
    void this.cargar();
  }

  @HostListener('window:online') alVolverLaSenal(): void { this.enLinea = true; this.cdr.detectChanges(); }
  @HostListener('window:offline') alPerderLaSenal(): void { this.enLinea = false; this.cdr.detectChanges(); }

  private async cargar(): Promise<void> {
    this.paquetes = await this.offline.listar();
    const id = this.route.snapshot.paramMap.get('id');
    this.actual = id ? (this.paquetes.find((p) => p.id === id) ?? null) : null;
    if (this.actual) await this.cargarWorkers(this.actual);
    this.cargando = false;
    this.cdr.detectChanges();
  }

  /** Lista de trabajadores del proyecto: la que se descargó con señal (y se refresca si ahora hay). */
  private async cargarWorkers(p: PaqueteOffline): Promise<void> {
    const guardado = await this.store.leerCache<AtsGrupoProyectoPublicoDto>(`resumen-proyecto:${p.tokenProyecto}`);
    this.workers = guardado?.trabajadores ?? [];
    if (this.enLinea) {
      this.svc.getResumenProyectoPublico(p.tokenProyecto).subscribe({
        next: (r) => { this.workers = r.trabajadores; this.cdr.detectChanges(); },
        error: () => {},
      });
    }
  }

  abrir(p: PaqueteOffline): void {
    this.router.navigate(['/ats-sin-conexion', p.id]).then(() => {
      this.actual = p;
      this.capturando = false;
      void this.cargarWorkers(p).then(() => this.cdr.detectChanges());
    });
  }

  volver(): void {
    this.router.navigate(['/ats-sin-conexion']).then(() => {
      this.actual = null;
      this.capturando = false;
      void this.cargar();
    });
  }

  get estadoClase(): string {
    return (this.actual?.estado ?? 'Pendiente').toLowerCase();
  }

  get disponibles(): AtsGrupoWorkerOpcionDto[] {
    const ya = new Set(this.actual?.adhesiones.map((a) => a.workerId) ?? []);
    return this.workers.filter((w) => !ya.has(w.workerId));
  }

  get pendientesDeEnvio(): number {
    return this.actual?.adhesiones.filter((a) => a.estado !== 'Enviado').length ?? 0;
  }

  // ── Captura ────────────────────────────────────────────────────────────

  empezarCaptura(): void {
    this.capturando = true;
    this.workerId = null;
    this.dni = '';
    this.acepta = false;
    this.camaraLista = false;
    this.gpsCoords = null;
    this.gpsEstado = 'buscando';
    this.pedirUbicacion();
    this.cdr.detectChanges();
  }

  cancelarCaptura(): void {
    this.capturando = false;
    this.cdr.detectChanges();
  }

  private pedirUbicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { this.gpsEstado = 'error'; return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.gpsCoords = pos.coords; this.gpsEstado = 'ok'; this.cdr.detectChanges(); },
      () => { this.gpsEstado = 'error'; this.cdr.detectChanges(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  onCamaraLista(): void { this.camaraLista = true; this.cdr.detectChanges(); }

  get selfieOverlayLineas(): string[] {
    const lineas = [new Date().toLocaleString('es-PE'), 'Capturado sin conexión'];
    if (this.actual?.proyectoNombre) lineas.push(this.actual.proyectoNombre);
    if (this.gpsCoords) lineas.push(`${this.gpsCoords.latitude.toFixed(5)}, ${this.gpsCoords.longitude.toFixed(5)}`);
    return lineas;
  }

  get puedeGuardar(): boolean {
    return !!this.workerId && this.dni.trim().length >= 3 && this.camaraLista && this.acepta && !this.guardando;
  }

  async guardarFirmante(): Promise<void> {
    const p = this.actual;
    if (!p || !this.puedeGuardar || !this.camara) return;
    const elegido = this.workers.find((w) => w.workerId === this.workerId);
    const dni = this.dni.trim();

    // Sin servidor la identidad se valida contra los últimos dígitos descargados antes; el servidor la vuelve a validar al subir.
    if (elegido?.dniUltimos4 && dni.length <= 4 && !elegido.dniUltimos4.endsWith(dni)) {
      Swal.fire({ icon: 'error', title: 'Los dígitos no coinciden', text: 'Revisa los últimos dígitos del DNI.' });
      return;
    }
    const foto = this.camara.capturarFoto();
    if (!foto) {
      Swal.fire({ icon: 'error', title: 'No se pudo capturar la selfie', text: 'Intenta de nuevo.' });
      return;
    }

    this.guardando = true;
    const a: AdhesionOffline = {
      id: this.offline.nuevoId(),
      workerId: this.workerId!,
      nombre: elegido?.nombre ?? '',
      dniConfirmacion: dni,
      selfieBase64: foto,
      horaDispositivo: new Date().toISOString(),
      lat: this.gpsCoords?.latitude ?? null,
      lng: this.gpsCoords?.longitude ?? null,
      precisionMetros: this.gpsCoords?.accuracy ?? null,
      aceptaConsentimiento: this.acepta,
      estado: 'Pendiente',
    };
    p.adhesiones.push(a);
    if (p.estado === 'Sincronizado') p.estado = 'Parcial'; // tiene firmantes nuevos por subir
    await this.offline.guardar(p);
    this.guardando = false;
    this.capturando = false;
    this.cdr.detectChanges();
  }

  async quitar(a: AdhesionOffline): Promise<void> {
    const p = this.actual;
    if (!p || a.estado === 'Enviado') return;
    const r = await Swal.fire({
      icon: 'question',
      title: `¿Quitar a ${a.nombre}?`,
      text: 'Se descarta su firma capturada en este celular.',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    p.adhesiones = p.adhesiones.filter((x) => x.id !== a.id);
    await this.offline.guardar(p);
    this.cdr.detectChanges();
  }

  // ── Subida ─────────────────────────────────────────────────────────────

  async subir(): Promise<void> {
    const p = this.actual;
    if (!p || this.sincronizando) return;
    if (!this.enLinea) {
      Swal.fire({ icon: 'info', title: 'Sin conexión', text: 'Sube el ATS cuando llegues a un lugar con internet.' });
      return;
    }
    this.sincronizando = true;
    this.cdr.detectChanges();
    try {
      const res = await this.offline.sincronizar(p, (np) => { this.actual = np; this.cdr.detectChanges(); });
      const errores = res.adhesiones.filter((a) => a.estado === 'Error').length;
      if (errores === 0) {
        Swal.fire({ icon: 'success', title: 'ATS subido', text: `Se enviaron ${res.adhesiones.length} firmante(s). Ya se puede validar desde la plataforma.` });
      } else {
        Swal.fire({ icon: 'warning', title: 'Subido con observaciones', text: `${errores} firmante(s) no se pudieron enviar — revisa el detalle y reintenta.` });
      }
    } catch (e) {
      const err = e as HttpErrorResponse;
      Swal.fire({
        icon: 'error',
        title: err.status === 0 ? 'Se perdió la señal' : 'No se pudo subir',
        text: err.status === 0 ? 'Lo capturado sigue guardado en este celular. Reintenta cuando haya señal.' : (err.error?.message ?? 'Intenta de nuevo.'),
      });
    } finally {
      this.sincronizando = false;
      this.cdr.detectChanges();
    }
  }

  async descartar(): Promise<void> {
    const p = this.actual;
    if (!p) return;
    const sinSubir = p.estado !== 'Sincronizado';
    const r = await Swal.fire({
      icon: 'warning',
      title: sinSubir ? '¿Descartar este ATS sin subirlo?' : '¿Quitar este ATS del celular?',
      text: sinSubir ? 'Se perderá lo capturado en este celular.' : 'Ya está en el servidor; solo se limpia la copia local.',
      showCancelButton: true,
      confirmButtonText: 'Descartar',
      confirmButtonColor: '#b91c1c',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    await this.offline.eliminar(p.id);
    this.volver();
  }
}
