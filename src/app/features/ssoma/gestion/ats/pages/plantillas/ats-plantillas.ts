import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AtsService } from '../../services/ats.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  AtsInitDto,
  AtsPlantillaDto,
  AtsPuestoDto,
  AtsPlantillaGuardarRequestDto,
  AtsPasoPuestoDto,
  AtsAutorizacionTrabajadorDto,
  AtsPeligroDto,
} from '../../dtos/ats.dtos';

@Component({
  selector: 'app-ats-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, AbrilModalPanel, SearchSelect],
  templateUrl: './ats-plantillas.html',
  styleUrl: './ats-plantillas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsPlantillas implements OnInit {
  tab: 'plantillas' | 'pasos' | 'autorizaciones' | 'riesgos' = 'plantillas';

  peligrosCatalogo: AtsPeligroDto[] = [];
  loadingRiesgos = false;
  guardandoRiesgoId: number | null = null;

  trabajadoresAutorizacion: AtsAutorizacionTrabajadorDto[] = [];
  loadingAutorizaciones = false;
  subiendoWorkerId: number | null = null;

  loading = true;
  plantillas: AtsPlantillaDto[] = [];
  puestos: AtsPuestoDto[] = [];
  catalogo: AtsInitDto | null = null;

  pasosPuesto: AtsPasoPuestoDto[] = [];
  loadingPasos = false;
  guardandoPasoId: number | null = null;

  modalAbierto = false;
  guardando = false;
  editandoId: number | null = null;

  nombre = '';
  puestoId: number | null = null;
  peligrosMarcados = new Set<number>();
  eppsMarcados = new Set<number>();
  herramientasMarcadas = new Set<number>();

  readonly headerTabs: AbrilPageTab[] = [
    { label: 'Listado ATS', icono: 'ti-list', route: '/ssoma/gestion/ats', exact: true },
    { label: 'Plantillas', icono: 'ti-clipboard-list', route: '/ssoma/gestion/ats/plantillas', exact: true },
    { label: 'Pasos por puesto', icono: 'ti-users', route: '/ssoma/gestion/ats/plantillas/pasos', exact: true },
    { label: 'Autorizaciones', icono: 'ti-file-signature', route: '/ssoma/gestion/ats/plantillas/autorizaciones', exact: true },
    { label: 'Riesgos', icono: 'ti-alert-triangle', route: '/ssoma/gestion/ats/plantillas/riesgos', exact: true },
  ];

  constructor(
    private svc: AtsService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Angular reutiliza esta MISMA instancia al navegar entre plantillas/pasos,
    // plantillas/autorizaciones y plantillas/riesgos (comparten el Route config
    // "plantillas/:tab", solo cambia el parámetro) — por eso hay que reaccionar
    // a cada cambio de parámetro, no leerlo una sola vez en el arranque.
    this.route.paramMap.subscribe((params) => {
      const tabParam = params.get('tab');
      this.tab = tabParam === 'pasos' || tabParam === 'autorizaciones' || tabParam === 'riesgos' ? tabParam : 'plantillas';
      if (this.tab === 'pasos' && this.pasosPuesto.length === 0) this.cargarPasosPuesto();
      if (this.tab === 'autorizaciones' && this.trabajadoresAutorizacion.length === 0) this.cargarAutorizaciones();
      if (this.tab === 'riesgos' && this.peligrosCatalogo.length === 0) this.cargarRiesgos();
      this.cdr.markForCheck();
    });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getPuestos().subscribe({ next: (p) => { this.puestos = p; this.cdr.markForCheck(); }, error: () => {} });
    this.svc.getInit().subscribe({
      next: (init) => { this.catalogo = init; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.svc.getPlantillas().subscribe({
      next: (list) => { this.plantillas = list; this.loading = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get puestoOpts(): { id: number; nombre: string }[] {
    return this.puestos;
  }

  puestoNombre(id?: number): string {
    return this.puestos.find((p) => p.id === id)?.nombre ?? '—';
  }

  cargarRiesgos(): void {
    this.loadingRiesgos = true;
    this.svc.getPeligros().subscribe({
      next: (list) => { this.peligrosCatalogo = list; this.loadingRiesgos = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingRiesgos = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  toggleRequierePetar(riesgo: { id: number; requierePetar: boolean }): void {
    const nuevoValor = !riesgo.requierePetar;
    this.guardandoRiesgoId = riesgo.id;
    this.cdr.markForCheck();
    this.svc.setRiesgoRequierePetar(riesgo.id, nuevoValor).subscribe({
      next: () => { riesgo.requierePetar = nuevoValor; this.guardandoRiesgoId = null; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.guardandoRiesgoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  cargarAutorizaciones(): void {
    this.loadingAutorizaciones = true;
    this.svc.getTrabajadoresAutorizacion().subscribe({
      next: (list) => { this.trabajadoresAutorizacion = list; this.loadingAutorizaciones = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingAutorizaciones = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  descargarPlantillaAutorizacion(t: AtsAutorizacionTrabajadorDto): void {
    this.svc.getPlantillaAutorizacionPdf(t.workerId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Autorizacion-ATS-${t.nombre}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  subirAutorizacion(t: AtsAutorizacionTrabajadorDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.subiendoWorkerId = t.workerId;
    this.cdr.markForCheck();
    this.svc.subirAutorizacionPermiso(t.workerId, archivo).subscribe({
      next: () => {
        this.subiendoWorkerId = null;
        input.value = '';
        this.cargarAutorizaciones();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoWorkerId = null;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cargarPasosPuesto(): void {
    this.loadingPasos = true;
    this.svc.getPasoPuestoMapeo().subscribe({
      next: (list) => { this.pasosPuesto = list; this.loadingPasos = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingPasos = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get pasosPorCategoria(): { categoria: string; items: AtsPasoPuestoDto[] }[] {
    const grupos = new Map<string, AtsPasoPuestoDto[]>();
    for (const p of this.pasosPuesto) {
      if (!grupos.has(p.categoriaNombre)) grupos.set(p.categoriaNombre, []);
      grupos.get(p.categoriaNombre)!.push(p);
    }
    return Array.from(grupos.entries()).map(([categoria, items]) => ({ categoria, items }));
  }

  puestosDisponiblesPara(paso: AtsPasoPuestoDto): { id: number; nombre: string }[] {
    return this.puestos.filter((p) => !paso.puestoIds.includes(p.id));
  }

  puestoNombresDe(paso: AtsPasoPuestoDto): { id: number; nombre: string }[] {
    return paso.puestoIds.map((id) => ({ id, nombre: this.puestoNombre(id) }));
  }

  private guardarMapeo(paso: AtsPasoPuestoDto): void {
    this.guardandoPasoId = paso.pasoId;
    this.cdr.markForCheck();
    this.svc.setPasoPuestos(paso.pasoId, paso.puestoIds).subscribe({
      next: () => { this.guardandoPasoId = null; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.guardandoPasoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  agregarPuesto(paso: AtsPasoPuestoDto, puestoId: number | null): void {
    if (!puestoId || paso.puestoIds.includes(puestoId)) return;
    paso.puestoIds.push(puestoId);
    this.guardarMapeo(paso);
  }

  quitarPuesto(paso: AtsPasoPuestoDto, puestoId: number): void {
    paso.puestoIds = paso.puestoIds.filter((id) => id !== puestoId);
    this.guardarMapeo(paso);
  }

  nuevaPlantilla(): void {
    this.editandoId = null;
    this.nombre = '';
    this.puestoId = null;
    this.peligrosMarcados = new Set();
    this.eppsMarcados = new Set();
    this.herramientasMarcadas = new Set();
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  editar(p: AtsPlantillaDto): void {
    this.editandoId = p.id;
    this.nombre = p.nombre;
    this.puestoId = p.puestoId ?? null;
    this.peligrosMarcados = new Set(p.peligroIds);
    this.eppsMarcados = new Set(p.eppIds);
    this.herramientasMarcadas = new Set(p.herramientaIds);
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.cdr.markForCheck();
  }

  peligroMarcado(id: number): boolean { return this.peligrosMarcados.has(id); }
  togglePeligro(id: number): void { this.peligrosMarcados.has(id) ? this.peligrosMarcados.delete(id) : this.peligrosMarcados.add(id); }

  eppMarcado(id: number): boolean { return this.eppsMarcados.has(id); }
  toggleEpp(id: number): void { this.eppsMarcados.has(id) ? this.eppsMarcados.delete(id) : this.eppsMarcados.add(id); }

  herramientaMarcada(id: number): boolean { return this.herramientasMarcadas.has(id); }
  toggleHerramienta(id: number): void { this.herramientasMarcadas.has(id) ? this.herramientasMarcadas.delete(id) : this.herramientasMarcadas.add(id); }

  get puedeGuardar(): boolean {
    return !!this.nombre.trim() && !this.guardando;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.guardando = true;
    this.cdr.markForCheck();

    const dto: AtsPlantillaGuardarRequestDto = {
      nombre: this.nombre.trim(),
      puestoId: this.puestoId ?? undefined,
      peligroIds: Array.from(this.peligrosMarcados),
      eppIds: Array.from(this.eppsMarcados),
      herramientaIds: Array.from(this.herramientasMarcadas),
    };

    const alTerminar = () => {
      this.guardando = false;
      this.modalAbierto = false;
      this.cargar();
      this.cdr.markForCheck();
    };
    const alFallar = (err: HttpErrorResponse) => {
      this.guardando = false;
      this.errorService.handleError(err);
      this.cdr.markForCheck();
    };

    if (this.editandoId) {
      this.svc.editarPlantilla(this.editandoId, dto).subscribe({ next: alTerminar, error: alFallar });
    } else {
      this.svc.crearPlantilla(dto).subscribe({ next: alTerminar, error: alFallar });
    }
  }

  desactivar(p: AtsPlantillaDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar "${p.nombre}"?`,
      text: 'Dejará de sugerirse en el formulario de ATS. No afecta los ATS ya firmados con ella.',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.desactivarPlantilla(p.id).subscribe({
        next: () => this.cargar(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
