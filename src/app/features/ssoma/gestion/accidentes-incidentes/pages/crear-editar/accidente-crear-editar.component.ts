import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import {
  CrearFlashReportRequest,
  DescansoRequest,
  FlashReportInicializarDto,
  FlashProyectoDto,
  CatalogoItemDto,
  ContratistaCatalogoDto,
  TrabajadorCatalogoDto,
  ProyectoContratistaDto,
  TrabajadorAfectadoRequest,
  NIVELES_CONSECUENCIA,
  TURNOS,
  TIPOS_CONTACTO,
  NIVELES_CONSECUENCIA_INCIDENTE,
} from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-crear-editar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './accidente-crear-editar.component.html',
  styleUrl: './accidente-crear-editar.component.css',
})
export class AccidenteCrearEditarComponent implements OnInit {
  modoEditar = false;
  id?: number;
  guardando = false;
  cargando = true;

  init?: FlashReportInicializarDto;

  // listas para selects
  proyectos: FlashProyectoDto[] = [];
  tipos: CatalogoItemDto[] = [];
  etapas: CatalogoItemDto[] = [];
  partes: CatalogoItemDto[] = [];
  empresasAbril: CatalogoItemDto[] = [];
  partidas: CatalogoItemDto[] = [];
  contratistas: ContratistaCatalogoDto[] = [];
  trabajadores: TrabajadorCatalogoDto[] = [];
  proyectoContratistas: ProyectoContratistaDto[] = [];

  // estado local (no va al form)
  jefeInmediatoWorkerId?: number;
  elaboradoPorWorkerId?: number;
  sinTrabajadorAfectado = false;

  trabajadorNuevo: TrabajadorAfectadoRequest = { trabajadorNombre: '' };

  readonly nivelesConsecuencia = NIVELES_CONSECUENCIA;
  readonly nivelesOpciones = [1, 2, 3, 4, 5, 6];
  readonly turnos = TURNOS;
  readonly tiposContacto = TIPOS_CONTACTO;

  // Tipo de empresa: 'abril' | 'contratista'
  tipoEmpresa: 'abril' | 'contratista' = 'abril';

  // Fotos preview
  foto1Preview: string | null = null;
  foto2Preview: string | null = null;

  form: CrearFlashReportRequest = {
    proyectoId: 0,
    tipoId: 0,
    fecha: new Date().toISOString().substring(0, 10),
    hora: '',
    lugarExacto: '',
    descripcion: '',
    danioProcesFlag: false,
    descansos: [],
    trabajadores: [],
  };

  errores: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEditar = true;
      this.id = Number(idParam);
    }

    this.loaderService.show();
    this.service.inicializar().subscribe({
      next: (init) => {
        this.init = init;
        this.proyectos = init.proyectos;
        this.tipos = init.tipos;
        this.etapas = init.etapasProyecto;
        this.partes = init.partesAfectadas;
        this.empresasAbril = init.empresasAbril;
        this.partidas = init.partidas;
        this.contratistas = init.contratistas;
        this.trabajadores = init.trabajadores;
        this.proyectoContratistas = init.proyectoContratistas ?? [];

        if (this.modoEditar) {
          this.cargarDetalle();
        } else {
          this.cargando = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.loaderService.hide();
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarDetalle(): void {
    this.service.getDetalle(this.id!).subscribe({
      next: (res) => {
        this.tipoEmpresa = res.empresaAbrilId ? 'abril' : 'contratista';
        this.form = {
          proyectoId: res.proyectoId,
          tipoId: res.tipoId,
          fecha: res.fecha.substring(0, 10),
          hora: res.hora ?? '',
          lugarExacto: res.lugarExacto,
          descripcion: res.descripcion,
          empresaAbrilId: res.empresaAbrilId,
          contributorId: res.contributorId,
          jefeInmediatoNombre: res.jefeInmediatoNombre,
          etapaProyectoId: res.etapaProyectoId,
          partidaId: res.partidaId,
          workerId: res.workerId,
          trabajadorNombre: res.trabajadorNombre,
          puestoTrabajo: res.puestoTrabajo,
          edad: res.edad,
          aniosExperiencia: res.aniosExperiencia,
          celularTrabajador: res.celularTrabajador,
          parteAfectadaId: res.parteAfectadaId,
          turno: res.turno,
          tipoContacto: res.tipoContacto,
          danioProcesFlag: res.danioProcesFlag ?? false,
          atencionMedica: res.atencionMedica,
          centroAtencion: res.centroAtencion,
          danoProceso: res.danoProceso,
          consecuenciaRealPersonal: res.consecuenciaRealPersonal,
          consecuenciaPotencialPersonal: res.consecuenciaPotencialPersonal,
          accionesInmediatas: res.accionesInmediatas,
          elaboradoPorNombre: res.elaboradoPorNombre,
          elaboradoPorCargo: res.elaboradoPorCargo,
          elaboradoPorEmail: res.elaboradoPorEmail,
          elaboradoPorTelefono: res.elaboradoPorTelefono,
          descansos: res.descansos.map((d) => ({
            fechaInicio: d.fechaInicio.substring(0, 10),
            fechaFin: d.fechaFin.substring(0, 10),
            observacion: d.observacion,
          })),
          trabajadores: (res.trabajadores ?? []).map((t) => ({
            workerId: t.workerId,
            trabajadorNombre: t.trabajadorNombre,
            puestoTrabajo: t.puestoTrabajo,
            edad: t.edad,
            aniosExperiencia: t.aniosExperiencia,
            celularTrabajador: t.celularTrabajador,
            parteAfectadaId: t.parteAfectadaId,
          })),
        };
        this.foto1Preview = res.urlFoto1 ?? null;
        this.foto2Preview = res.urlFoto2 ?? null;
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cargando = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  onFotoSelect(event: Event, slot: 1 | 2): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (slot === 1) {
        this.form.foto1Base64 = b64;
        this.foto1Preview = b64;
      } else {
        this.form.foto2Base64 = b64;
        this.foto2Preview = b64;
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  quitarFoto(slot: 1 | 2): void {
    if (slot === 1) { this.form.foto1Base64 = undefined; this.foto1Preview = null; }
    else { this.form.foto2Base64 = undefined; this.foto2Preview = null; }
    this.cdr.detectChanges();
  }

  // ── Descansos ──────────────────────────────────────────────────────────────

  agregarDescanso(): void {
    this.form.descansos.push({ fechaInicio: '', fechaFin: '' });
    this.cdr.detectChanges();
  }

  quitarDescanso(i: number): void {
    this.form.descansos.splice(i, 1);
    this.cdr.detectChanges();
  }

  // ── Proyecto change ────────────────────────────────────────────────────────

  onProyectoChange(id: number): void {
    this.form.proyectoId = id;
    this.form.empresaAbrilId = undefined;
    this.form.contributorId = undefined;
    this.jefeInmediatoWorkerId = undefined;
    this.form.jefeInmediatoNombre = undefined;
    this.cdr.detectChanges();
  }

  // ── Empresa change ─────────────────────────────────────────────────────────

  onEmpresaChange(): void {
    this.jefeInmediatoWorkerId = undefined;
    this.form.jefeInmediatoNombre = undefined;
    this.cdr.detectChanges();
  }

  // ── Jefe inmediato ─────────────────────────────────────────────────────────

  onJefeSelect(id: number | undefined): void {
    this.jefeInmediatoWorkerId = id;
    if (id) {
      const w = this.trabajadores.find((t) => t.id === id);
      this.form.jefeInmediatoNombre = w?.nombreCompleto;
    } else {
      this.form.jefeInmediatoNombre = undefined;
    }
    this.cdr.detectChanges();
  }

  // ── Trabajador autocompletado ──────────────────────────────────────────────

  onTrabajadorSelect(id: number | undefined): void {
    this.trabajadorNuevo.workerId = id;
    if (id) {
      const t = this.trabajadores.find((w) => w.id === id);
      if (t) {
        this.trabajadorNuevo.trabajadorNombre = t.nombreCompleto;
        this.trabajadorNuevo.puestoTrabajo = t.cargo ?? this.trabajadorNuevo.puestoTrabajo;
        this.trabajadorNuevo.edad = t.edad ?? this.trabajadorNuevo.edad;
        this.trabajadorNuevo.aniosExperiencia = t.aniosExperiencia ?? this.trabajadorNuevo.aniosExperiencia;
      }
    }
    this.cdr.detectChanges();
  }

  agregarTrabajador(): void {
    if (!this.trabajadorNuevo.trabajadorNombre?.trim()) return;
    this.form.trabajadores.push({ ...this.trabajadorNuevo });
    this.trabajadorNuevo = { trabajadorNombre: '' };
    this.cdr.detectChanges();
  }

  quitarTrabajador(index: number): void {
    this.form.trabajadores.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ── Elaborado por ──────────────────────────────────────────────────────────

  onElaboradoPorSelect(id: number | undefined): void {
    this.elaboradoPorWorkerId = id;
    if (id) {
      const w = this.trabajadores.find((t) => t.id === id);
      if (w) {
        this.form.elaboradoPorNombre = w.nombreCompleto;
        this.form.elaboradoPorCargo = w.cargo ?? this.form.elaboradoPorCargo;
      }
    }
    this.cdr.detectChanges();
  }

  // ── Validación y guardado ──────────────────────────────────────────────────

  validar(): boolean {
    this.errores = {};
    if (!this.form.proyectoId) this.errores['proyectoId'] = 'Proyecto requerido.';
    if (!this.form.tipoId) this.errores['tipoId'] = 'Tipo requerido.';
    if (!this.form.fecha) this.errores['fecha'] = 'Fecha requerida.';
    if (!this.form.lugarExacto?.trim()) this.errores['lugarExacto'] = 'Lugar exacto requerido.';
    if (!this.form.descripcion?.trim()) this.errores['descripcion'] = 'Descripción requerida.';
    if (!this.form.accionesInmediatas?.trim()) this.errores['accionesInmediatas'] = 'Acciones inmediatas requeridas.';

    // Incidente con primeros auxilios (N2) obliga a registrar al trabajador afectado
    const primerAuxilio = this.esIncidente && this.form.consecuenciaRealPersonal === 2;
    if (primerAuxilio && this.sinTrabajadorAfectado) {
      this.sinTrabajadorAfectado = false; // forzar sección visible
      this.errores['trabajadores'] = 'Con primeros auxilios (N2) debe registrar al trabajador afectado.';
    } else if (!this.sinTrabajadorAfectado && !this.esIncidente && this.form.trabajadores.length === 0) {
      this.errores['trabajadores'] = 'Debe añadir al menos un trabajador afectado.';
    } else if (!this.sinTrabajadorAfectado && primerAuxilio && this.form.trabajadores.length === 0) {
      this.errores['trabajadores'] = 'Con primeros auxilios debe registrar al trabajador que recibió atención.';
    }

    return Object.keys(this.errores).length === 0;
  }

  guardar(): void {
    if (!this.validar()) { this.cdr.detectChanges(); return; }

    // Limpiar empresa no usada
    if (this.tipoEmpresa === 'abril') this.form.contributorId = undefined;
    else this.form.empresaAbrilId = undefined;

    this.guardando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    const obs$ = this.modoEditar
      ? this.service.actualizar(this.id!, this.form)
      : this.service.crear(this.form);

    obs$.subscribe({
      next: async (res: any) => {
        this.guardando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: this.modoEditar ? 'Actualizado' : 'Flash Report creado',
          text: res.message ?? 'Operación exitosa.',
          timer: 1800,
          showConfirmButton: false,
        });
        const destId = this.modoEditar ? this.id! : res.id;
        this.router.navigate(['/ssoma/gestion/accidentes-incidentes', destId]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    if (this.modoEditar) this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id]);
    else this.router.navigate(['/ssoma/gestion/accidentes-incidentes/lista']);
  }

  get tipoCodigo(): string {
    return this.tipos.find((t) => t.id === this.form.tipoId)?.codigo ?? '';
  }

  get esIncidente(): boolean {
    return this.tipoCodigo === 'IN';
  }

  // Consecuencia REAL: incidente solo N1-N2 (sin daño / primeros auxilios)
  get nivelesReal(): number[] {
    return this.esIncidente ? [1, 2] : this.nivelesOpciones;
  }

  // Consecuencia POTENCIAL: siempre todos (lo que PODRÍA haber pasado)
  get nivelesPotencial(): number[] {
    return this.nivelesOpciones;
  }

  get titulo(): string {
    return this.modoEditar ? 'Editar Flash Report' : 'Nuevo Flash Report';
  }

  proyectosOpts() {
    return this.proyectos.map((p) => ({ projectId: p.id, projectDescription: p.nombre }));
  }

  trabajadoresOpts() {
    return this.trabajadores.map((t) => ({ id: t.id, label: `${t.nombreCompleto}${t.cargo ? ' — ' + t.cargo : ''}` }));
  }

  contratistasDelProyecto() {
    if (!this.form.proyectoId) return this.contratistas;
    const ids = new Set(
      this.proyectoContratistas
        .filter((pc) => pc.proyectoId === this.form.proyectoId)
        .map((pc) => pc.contributorId),
    );
    return ids.size ? this.contratistas.filter((c) => ids.has(c.id)) : this.contratistas;
  }

  empresasAbrilDelProyecto() {
    return this.empresasAbril;
  }

  jefeInmediatoOpts() {
    const contributorId = this.tipoEmpresa === 'abril' ? this.form.empresaAbrilId : this.form.contributorId;
    const workers = contributorId
      ? this.trabajadores.filter((w) => w.contributorId === contributorId)
      : this.trabajadores;
    return workers.map((w) => ({ id: w.id, label: `${w.nombreCompleto}${w.cargo ? ' — ' + w.cargo : ''}` }));
  }

  elaboradoPorOpts() {
    return this.trabajadores.map((w) => ({
      id: w.id,
      label: `${w.nombreCompleto}${w.cargo ? ' — ' + w.cargo : ''}`,
    }));
  }

  partidasOpts() {
    return this.partidas.map((p) => ({ id: p.id, nombre: p.nombre }));
  }
}
