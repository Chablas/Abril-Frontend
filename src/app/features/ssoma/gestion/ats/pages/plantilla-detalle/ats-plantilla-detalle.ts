import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../../services/ats.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  AtsInitDto,
  AtsPlantillaDto,
  AtsPeligroDto,
  AtsPlantillaActividadDto,
  AtsRiesgoConControlesDto,
  AtsPlantillaGuardarRequestDto,
  TipoControl,
  TIPOS_CONTROL,
} from '../../dtos/ats.dtos';

/**
 * Vista consolidada de UNA plantilla — antes esto estaba repartido entre un modal (Actividades),
 * un tab global (Riesgos) y otro tab global (Controles), sin forma de ver/editar de una
 * especialidad concreta (ej. "ATS Izaje") sus actividades+pasos+peligros+controles juntos.
 * Los tabs globales Riesgos/Controles se dejan intactos (siguen sirviendo para gestión masiva
 * entre TODAS las plantillas) — esta página es el complemento por-especialidad.
 */
@Component({
  selector: 'app-ats-plantilla-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ats-plantilla-detalle.html',
  styleUrl: './ats-plantilla-detalle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsPlantillaDetalle implements OnInit {
  plantillaId!: number;
  plantilla: AtsPlantillaDto | null = null;
  catalogo: AtsInitDto | null = null;
  peligrosCatalogo: AtsPeligroDto[] = [];
  riesgosControles: AtsRiesgoConControlesDto[] = [];
  actividades: AtsPlantillaActividadDto[] = [];

  loading = true;
  loadingActividades = false;
  loadingRiesgos = false;
  loadingControles = false;

  nombre = '';
  peligrosMarcados = new Set<number>();
  eppsMarcados = new Set<number>();
  herramientasMarcadas = new Set<number>();
  guardandoGeneral = false;

  nuevaActividadTexto = '';
  guardandoActividad = false;
  nuevoPasoTexto: Record<number, string> = {};
  guardandoPasoActividadId: number | null = null;

  guardandoRiesgoId: number | null = null;
  nuevoControlTexto: Record<number, string> = {};
  nuevoControlTipo: Record<number, TipoControl> = {};
  guardandoControlRiesgoId: number | null = null;
  readonly tiposControl = TIPOS_CONTROL;

  tipoControlDe(riesgoId: number): TipoControl {
    return this.nuevoControlTipo[riesgoId] ?? 'Administrativo';
  }

  setTipoControlDe(riesgoId: number, tipo: TipoControl): void {
    this.nuevoControlTipo[riesgoId] = tipo;
  }

  tipoControlLabel(tipo: TipoControl): string {
    return TIPOS_CONTROL.find((t) => t.value === tipo)?.label ?? tipo;
  }

  constructor(
    private svc: AtsService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.plantillaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  private cargar(): void {
    this.loading = true;
    this.svc.getPlantillas().subscribe({
      next: (lista) => {
        this.plantilla = lista.find((p) => p.id === this.plantillaId) ?? null;
        if (!this.plantilla) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.nombre = this.plantilla.nombre;
        this.peligrosMarcados = new Set(this.plantilla.peligroIds);
        this.eppsMarcados = new Set(this.plantilla.eppIds);
        this.herramientasMarcadas = new Set(this.plantilla.herramientaIds);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.loading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });

    this.svc.getInit().subscribe({ next: (init) => { this.catalogo = init; this.cdr.markForCheck(); }, error: () => {} });

    this.loadingRiesgos = true;
    this.svc.getPeligros().subscribe({
      next: (list) => { this.peligrosCatalogo = list; this.loadingRiesgos = false; this.cdr.markForCheck(); },
      error: () => { this.loadingRiesgos = false; this.cdr.markForCheck(); },
    });

    this.loadingControles = true;
    this.svc.getRiesgosConControles().subscribe({
      next: (list) => { this.riesgosControles = list; this.loadingControles = false; this.cdr.markForCheck(); },
      error: () => { this.loadingControles = false; this.cdr.markForCheck(); },
    });

    this.loadingActividades = true;
    this.svc.getActividadesDePlantilla(this.plantillaId).subscribe({
      next: (list) => { this.actividades = list; this.loadingActividades = false; this.cdr.markForCheck(); },
      error: () => { this.loadingActividades = false; this.cdr.markForCheck(); },
    });
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/ats/plantillas']);
  }

  // ── Datos generales: nombre + peligros + EPP + herramientas ─────────────

  peligroMarcado(id: number): boolean { return this.peligrosMarcados.has(id); }
  togglePeligro(id: number): void { this.peligrosMarcados.has(id) ? this.peligrosMarcados.delete(id) : this.peligrosMarcados.add(id); }

  eppMarcado(id: number): boolean { return this.eppsMarcados.has(id); }
  toggleEpp(id: number): void { this.eppsMarcados.has(id) ? this.eppsMarcados.delete(id) : this.eppsMarcados.add(id); }

  herramientaMarcada(id: number): boolean { return this.herramientasMarcadas.has(id); }
  toggleHerramienta(id: number): void { this.herramientasMarcadas.has(id) ? this.herramientasMarcadas.delete(id) : this.herramientasMarcadas.add(id); }

  get puedeGuardarGeneral(): boolean {
    return !!this.nombre.trim() && !this.guardandoGeneral;
  }

  guardarGeneral(): void {
    if (!this.puedeGuardarGeneral || !this.plantilla) return;
    this.guardandoGeneral = true;
    this.cdr.markForCheck();

    const dto: AtsPlantillaGuardarRequestDto = {
      nombre: this.nombre.trim(),
      peligroIds: Array.from(this.peligrosMarcados),
      eppIds: Array.from(this.eppsMarcados),
      herramientaIds: Array.from(this.herramientasMarcadas),
    };

    this.svc.editarPlantilla(this.plantilla.id, dto).subscribe({
      next: () => {
        this.guardandoGeneral = false;
        if (this.plantilla) this.plantilla.peligroIds = dto.peligroIds;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.guardandoGeneral = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── Peligros/Riesgos y Controles — filtrados a los peligros GUARDADOS de esta plantilla ──

  /** Se filtra contra plantilla.peligroIds (lo ya guardado), no contra peligrosMarcados (lo que
   *  se está editando arriba sin guardar aún) — evita mostrar riesgos de un peligro que todavía
   *  no se confirmó con "Guardar cambios". */
  get peligrosDeEstaPlantilla(): AtsPeligroDto[] {
    if (!this.plantilla) return [];
    const ids = new Set(this.plantilla.peligroIds);
    return this.peligrosCatalogo.filter((p) => ids.has(p.id));
  }

  get controlesDeEstaPlantilla(): { peligroNombre: string; riesgos: AtsRiesgoConControlesDto[] }[] {
    if (!this.plantilla) return [];
    const ids = new Set(this.plantilla.peligroIds);
    const grupos = new Map<string, AtsRiesgoConControlesDto[]>();
    for (const r of this.riesgosControles) {
      if (!ids.has(r.peligroId)) continue;
      if (!grupos.has(r.peligroNombre)) grupos.set(r.peligroNombre, []);
      grupos.get(r.peligroNombre)!.push(r);
    }
    return Array.from(grupos.entries()).map(([peligroNombre, riesgos]) => ({ peligroNombre, riesgos }));
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

  agregarControl(r: AtsRiesgoConControlesDto): void {
    const texto = (this.nuevoControlTexto[r.riesgoId] ?? '').trim();
    if (!texto || this.guardandoControlRiesgoId === r.riesgoId) return;
    const tipo = this.tipoControlDe(r.riesgoId);
    this.guardandoControlRiesgoId = r.riesgoId;
    this.cdr.markForCheck();
    this.svc.crearControl(r.riesgoId, { texto, tipo }).subscribe({
      next: (res) => {
        r.controles.push({ id: res.id, texto, tipo, orden: r.controles.length + 1 });
        this.nuevoControlTexto[r.riesgoId] = '';
        this.guardandoControlRiesgoId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.guardandoControlRiesgoId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  eliminarControl(r: AtsRiesgoConControlesDto, controlId: number): void {
    this.svc.eliminarControl(controlId).subscribe({
      next: () => { r.controles = r.controles.filter((c) => c.id !== controlId); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Actividades/pasos de esta plantilla ─────────────────────────────────

  peligrosDePlantilla(): AtsPeligroDto[] {
    return this.peligrosDeEstaPlantilla;
  }

  agregarActividad(): void {
    const texto = this.nuevaActividadTexto.trim();
    if (!texto || this.guardandoActividad) return;
    this.guardandoActividad = true;
    this.cdr.markForCheck();
    this.svc.crearActividad(this.plantillaId, { texto }).subscribe({
      next: (res) => {
        this.actividades.push({ id: res.id, plantillaId: this.plantillaId, texto, orden: this.actividades.length + 1, pasos: [], peligroIds: [] });
        this.nuevaActividadTexto = '';
        this.guardandoActividad = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.guardandoActividad = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  editarActividad(a: AtsPlantillaActividadDto): void {
    Swal.fire({
      title: 'Editar actividad',
      input: 'text',
      inputValue: a.texto,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value?.trim() ? 'Escribe un texto' : undefined),
    }).then((r) => {
      if (!r.isConfirmed || !r.value?.trim()) return;
      this.svc.editarActividad(a.id, { texto: r.value.trim() }).subscribe({
        next: () => { a.texto = r.value.trim(); this.cdr.markForCheck(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  eliminarActividad(a: AtsPlantillaActividadDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Eliminar "${a.texto}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.eliminarActividad(a.id).subscribe({
        next: () => { this.actividades = this.actividades.filter((x) => x.id !== a.id); this.cdr.markForCheck(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  actividadTienePeligro(a: AtsPlantillaActividadDto, peligroId: number): boolean {
    return a.peligroIds.includes(peligroId);
  }

  toggleActividadPeligro(a: AtsPlantillaActividadDto, peligroId: number): void {
    const nuevos = a.peligroIds.includes(peligroId)
      ? a.peligroIds.filter((id) => id !== peligroId)
      : [...a.peligroIds, peligroId];
    a.peligroIds = nuevos;
    this.cdr.markForCheck();
    this.svc.setActividadPeligros(a.id, { peligroIds: nuevos }).subscribe({
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  agregarPasoActividad(a: AtsPlantillaActividadDto): void {
    const texto = (this.nuevoPasoTexto[a.id] ?? '').trim();
    if (!texto || this.guardandoPasoActividadId === a.id) return;
    this.guardandoPasoActividadId = a.id;
    this.cdr.markForCheck();
    this.svc.crearPasoActividad(a.id, { texto }).subscribe({
      next: (res) => {
        a.pasos.push({ id: res.id, texto, orden: a.pasos.length + 1 });
        this.nuevoPasoTexto[a.id] = '';
        this.guardandoPasoActividadId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.guardandoPasoActividadId = null; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  eliminarPasoActividad(a: AtsPlantillaActividadDto, pasoId: number): void {
    this.svc.eliminarPasoActividad(pasoId).subscribe({
      next: () => { a.pasos = a.pasos.filter((p) => p.id !== pasoId); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
