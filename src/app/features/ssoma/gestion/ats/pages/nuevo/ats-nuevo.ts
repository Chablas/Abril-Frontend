import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../../services/ats.service';
import {
  AtsInitDto,
  AtsPeligroDto,
  AtsRiesgoDto,
  AtsGuardarRequestDto,
  AtsRiesgoConControlesDto,
  AtsPlantillaActividadDto,
  NivelRiesgo,
  TipoControl,
} from '../../dtos/ats.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectTorreDTO, NivelTorreOpcion, nivelesDeTorre } from '../../../../../../core/dtos/project/projectTorre.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { CameraCapture } from '../../../../../../shared/components/camera-capture/camera-capture';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { AutoAlturaTextareaDirective } from '../../../../../../shared/directives/auto-altura-textarea.directive';
import { FirmaPersonalService } from '../../../../../../core/firma/firma-personal.service';
import { FirmaPersonalDto } from '../../../../../../core/firma/firma-personal.dto';

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
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel, CameraCapture, SignaturePad, AutoAlturaTextareaDirective],
  templateUrl: './ats-nuevo.html',
  styleUrl: './ats-nuevo.css',
})
export class AtsNuevo implements OnInit {
  readonly pasoLabels = ['Datos y pasos', 'Peligros y riesgos', 'Valoración', 'Firmar'];
  readonly niveles = NIVELES;

  /** Controles reales sugeridos por riesgo (ej. riesgo "Sobreesfuerzos" → "No cargar más de 25
   *  kg", "Mantener la carga pegada al cuerpo"...) — configurados por el Coordinador SSOMA en
   *  Plantillas de ATS → pestaña "Controles", NUNCA inventados genéricos acá. Se cargan una
   *  sola vez al abrir el formulario e indexan por riesgoId para acceso O(1) en la matriz. */
  private controlesPorRiesgo = new Map<number, { texto: string; tipo: TipoControl }[]>();
  paso = 1;

  // Input de "+ agregar paso personalizado", uno por categoría
  nuevoPasoTexto = new Map<number, string>();

  /** Pasos "de una sola vez" que el trabajador escribió a mano para ESTE ATS puntual — viven
   *  solo en el formulario, nunca se guardan en el catálogo ni en la plantilla (no toda actividad
   *  se repite en otro ATS). tempId es negativo para no chocar nunca con un id real del catálogo. */
  pasosPersonalizados = new Map<number, { tempId: number; texto: string }[]>();
  private siguienteTempId = -1;

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

  // Torre + pisos (uno o varios) — solo si el proyecto tiene torres configuradas.
  torres: ProjectTorreDTO[] = [];
  torreNombre: string | null = null;
  nivelesSeleccionados = new Set<string>();
  esExterior = false;

  pasosMarcados = new Map<number, boolean>();
  eppsMarcados = new Set<number>();
  herramientasMarcadas = new Set<number>();
  riesgosSeleccionados: RiesgoSeleccionado[] = [];

  // "Otros" — herramienta que no está en el catálogo, solo para este ATS
  herramientasPersonalizadas: string[] = [];
  nuevaHerramientaTexto = '';

  // "No aplica" por categoría de herramientas (ej. Supervisión no usa Equipos de poder) — al
  // marcarlo se oculta esa categoría y no se exige elegir nada ahí.
  herramientasNoAplica = new Set<string>();

  // Secciones colapsables del paso 1 — controladas por Angular (no <details> nativo: dentro de
  // @if/@for con zone.js el toggle nativo se comportaba inconsistente al re-renderizar).
  mostrarPasosGenericos = true;
  mostrarHerramientas = true;

  // "No aplica" por categoría de pasos genéricos (ej. Liberación de Calidad no le toca hoy a
  // este puesto) — deja explícito que fue una decisión, no un olvido.
  pasosCategoriaNoAplica = new Set<number>();

  // ── Actividades y pasos según la Plantilla elegida (especialidad) ──────
  // Se recargan al cambiar de Plantilla. Los pasos marcados aquí viajan al backend igual que
  // los "de una sola vez" (categoriaNombre = texto de la actividad, sin paso_id de catálogo) —
  // no requiere ninguna tabla nueva, reusa el mismo mecanismo de paso libre.
  actividadesPlantilla: AtsPlantillaActividadDto[] = [];
  loadingActividadesPlantilla = false;
  actividadPasosMarcados = new Set<number>();
  mostrarActividadesPlantilla = true;

  // Paso 2 — firma
  camaraLista = false;
  gpsEstado: 'buscando' | 'ok' | 'error' = 'buscando';
  gpsCoords: GeolocationCoordinates | null = null;
  hayFirma = false;
  aceptaConsentimiento = false;
  firmando = false;

  /** Firma ya registrada por el trabajador (Contabilidad/Gestión Administrativa → "Tu firma"),
   *  para no obligarlo a redibujarla en cada ATS — mismo mecanismo que estampa facturas y la
   *  carta oferta (ver FirmaPersonalService). null mientras carga o si nunca registró una. */
  firmaGuardada: FirmaPersonalDto | null = null;
  usandoFirmaGuardada = false;

  @ViewChild(CameraCapture) camara?: CameraCapture;
  @ViewChild(SignaturePad) firmaPad?: SignaturePad;

  /** Fecha/hora, proyecto/lugar y coordenadas "quemadas" sobre la selfie — mismo criterio que
   *  las apps de cámara con marca de tiempo. Getter (no valor fijo) porque el GPS puede llegar
   *  después de que la cámara ya esté lista. */
  get selfieOverlayLineas(): string[] {
    const lineas = [new Date().toLocaleString('es-PE')];
    const proyecto = this.proyectosOpts.find((p) => p.id === this.proyectoId)?.nombre;
    if (proyecto) lineas.push(proyecto);
    if (!this.esExterior && this.torreNombre) lineas.push(`Torre ${this.torreNombre}`);
    else if (this.lugar.trim()) lineas.push(this.lugar.trim());
    if (this.gpsCoords) lineas.push(`${this.gpsCoords.latitude.toFixed(5)}, ${this.gpsCoords.longitude.toFixed(5)}`);
    return lineas;
  }

  constructor(
    private svc: AtsService,
    private firmaPersonalSvc: FirmaPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
  ) {}

  /** Id del ATS ya FIRMADO del que se parte (?corregir=123 o ?duplicar=123) — viaja como
   *  atsAnteriorId al guardar, nunca modifica el original (es inmutable). Ambos casos usan el
   *  mismo prellenado; solo cambia el aviso que ve el trabajador. */
  atsAnteriorId: number | null = null;
  modoOrigen: 'corregir' | 'duplicar' | null = null;
  /** ?grupal=1 — un solo ATS para toda la cuadrilla: el autor llena datos/pasos/peligros/
   *  valoración UNA vez y, en vez de firmar él mismo, genera un QR para que cada integrante se
   *  adhiera por su cuenta (selfie+geo+firma liviana), sin repetir el wizard. */
  modoGrupal = false;
  creandoGrupo = false;
  /** ?continuar=id — un ATS en Borrador (guardado hasta el paso 3, nunca llegó a Firmar) que se
   *  reabre para seguir llenándolo, a diferencia de corregir/duplicar esto EDITA el mismo
   *  registro (this.atsId = id), no crea uno nuevo. */
  private borradorId: number | null = null;

  ngOnInit(): void {
    this.modoGrupal = this.route.snapshot.queryParamMap.get('grupal') === '1';
    const corregir = this.route.snapshot.queryParamMap.get('corregir');
    const duplicar = this.route.snapshot.queryParamMap.get('duplicar');
    const continuar = this.route.snapshot.queryParamMap.get('continuar');
    this.atsAnteriorId = corregir ? Number(corregir) : duplicar ? Number(duplicar) : null;
    this.modoOrigen = corregir ? 'corregir' : duplicar ? 'duplicar' : null;
    this.borradorId = continuar ? Number(continuar) : null;

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
        this.aceptaConsentimiento = data.tieneConsentimiento;
        this.loadingInit = false;
        this.cdr.detectChanges();
        if (this.proyectoId) this.cargarTorres(this.proyectoId);

        if (this.atsAnteriorId) {
          this.cargarParaCorregir(this.atsAnteriorId);
        } else if (this.borradorId) {
          this.cargarParaCorregir(this.borradorId, true);
        } else if (data.plantillaSugeridaId) {
          this.onPlantillaChange(data.plantillaSugeridaId);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInit = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });

    // No es bloqueante para el wizard: si falla, la matriz de valoración sigue funcionando
    // con el textarea libre, solo sin los controles sugeridos como acceso rápido.
    this.svc.getRiesgosConControles().subscribe({
      next: (lista: AtsRiesgoConControlesDto[]) => {
        this.controlesPorRiesgo = new Map(
          lista.map((r) => [
            r.riesgoId,
            r.controles.slice().sort((a, b) => a.orden - b.orden).map((c) => ({ texto: c.texto, tipo: c.tipo })),
          ]),
        );
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /** Controles reales configurados para este riesgo (vacío si el Coordinador SSOMA todavía no
   *  cargó ninguno para él en Plantillas de ATS → Controles). */
  controlesSugeridosDe(riesgoId: number): { texto: string; tipo: TipoControl }[] {
    return this.controlesPorRiesgo.get(riesgoId) ?? [];
  }

  /** Solo los controles sugeridos que este riesgo TODAVÍA no tiene en su texto — al usar uno
   *  desaparece de la barra de sugerencias en vez de quedar ahí invitando a duplicarlo. */
  controlesSugeridosDisponibles(r: RiesgoSeleccionado): { texto: string; tipo: TipoControl }[] {
    return this.controlesSugeridosDe(r.riesgoId).filter((c) => !r.controles.includes(c.texto));
  }

  /** Advierte (no bloquea — la norma dice que el evaluador es quien decide el nivel residual)
   *  cuando el riesgo pasa de Alto a Bajo. Si hay controles catalogados de tipo Ingeniería/
   *  Eliminación/Sustitución para ese riesgo y NINGUNO está en el texto, el aviso es más
   *  específico; si no hay catálogo para comparar, igual se avisa con el criterio general. */
  saltoAltoABajoSinControlFuerte(r: RiesgoSeleccionado): boolean {
    if (r.riesgoBase !== 'A' || r.riesgoResidual !== 'B') return false;
    const sugeridosFuertes = this.controlesSugeridosDe(r.riesgoId).filter((c) => c.tipo !== 'Administrativo' && c.tipo !== 'Epp');
    if (sugeridosFuertes.length === 0) return true;
    return !sugeridosFuertes.some((c) => r.controles.includes(c.texto));
  }

  // ── "No aplica" por categoría de pasos genéricos ────────────────────────

  categoriaNoAplica(categoriaId: number): boolean {
    return this.pasosCategoriaNoAplica.has(categoriaId);
  }

  toggleCategoriaNoAplica(categoriaId: number, pasos: { id: number }[]): void {
    if (this.pasosCategoriaNoAplica.has(categoriaId)) {
      this.pasosCategoriaNoAplica.delete(categoriaId);
    } else {
      this.pasosCategoriaNoAplica.add(categoriaId);
      pasos.forEach((p) => this.pasosMarcados.delete(p.id));
    }
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

  pasosPersonalizadosDe(categoriaId: number): { tempId: number; texto: string }[] {
    return this.pasosPersonalizados.get(categoriaId) ?? [];
  }

  agregarPasoPersonalizado(categoriaId: number): void {
    const texto = (this.nuevoPasoTexto.get(categoriaId) ?? '').trim();
    if (!texto) return;

    const lista = this.pasosPersonalizados.get(categoriaId) ?? [];
    lista.push({ tempId: this.siguienteTempId--, texto });
    this.pasosPersonalizados.set(categoriaId, lista);
    this.nuevoPasoTexto.set(categoriaId, '');
    this.cdr.detectChanges();
  }

  quitarPasoPersonalizado(categoriaId: number, tempId: number): void {
    const lista = this.pasosPersonalizados.get(categoriaId);
    if (!lista) return;
    this.pasosPersonalizados.set(categoriaId, lista.filter((p) => p.tempId !== tempId));
    this.cdr.detectChanges();
  }

  // ── EPP / Herramientas ────────────────────────────────────────────────

  eppSeleccionado(id: number): boolean {
    return this.eppsMarcados.has(id);
  }

  toggleEpp(id: number): void {
    if (this.eppsMarcados.has(id)) this.eppsMarcados.delete(id);
    else this.eppsMarcados.add(id);
  }

  /** "Básico" primero (siempre va, sin importar la tarea), luego "Específico" (depende del
   *  peligro/tarea concreta) — antes era una sola lista plana sin distinguir. */
  get eppPorCategoria(): { categoria: string; items: { id: number; nombre: string }[] }[] {
    const orden = [
      'Básico',
      'Protección respiratoria',
      'Protección facial',
      'Trabajo en caliente',
      'Protección de manos',
      'Protección de pies',
      'Trabajos en altura',
    ];
    const grupos = new Map<string, { id: number; nombre: string }[]>();
    for (const e of this.init?.epps ?? []) {
      if (!grupos.has(e.categoria)) grupos.set(e.categoria, []);
      grupos.get(e.categoria)!.push({ id: e.id, nombre: e.nombre });
    }
    return Array.from(grupos.entries())
      .map(([categoria, items]) => ({ categoria, items }))
      .sort((a, b) => orden.indexOf(a.categoria) - orden.indexOf(b.categoria));
  }

  herramientaSeleccionada(id: number): boolean {
    return this.herramientasMarcadas.has(id);
  }

  toggleHerramienta(id: number, categoria: string): void {
    if (this.herramientasMarcadas.has(id)) {
      this.herramientasMarcadas.delete(id);
    } else {
      this.herramientasMarcadas.add(id);
      // Marcar algo en la categoría contradice "No aplica" — se destilda sola en vez de dejar
      // ambas cosas marcadas a la vez (ej. Andamio colgante + "No aplica" al mismo tiempo).
      this.herramientasNoAplica.delete(categoria);
    }
  }

  get herramientasPorCategoria(): { categoria: string; items: { id: number; nombre: string }[] }[] {
    const grupos = new Map<string, { id: number; nombre: string }[]>();
    for (const h of this.init?.herramientas ?? []) {
      if (!grupos.has(h.categoria)) grupos.set(h.categoria, []);
      grupos.get(h.categoria)!.push({ id: h.id, nombre: h.nombre });
    }
    return Array.from(grupos.entries()).map(([categoria, items]) => ({ categoria, items }));
  }

  herramientasCategoriaNoAplica(categoria: string): boolean {
    return this.herramientasNoAplica.has(categoria);
  }

  /** "No aplica" queda deshabilitado si ya hay algo marcado en esa categoría — no tiene sentido
   *  decir "no aplica" y tener Andamio colgante tildado al mismo tiempo; hay que destildar
   *  primero lo marcado. */
  herramientasCategoriaTieneAlgoMarcado(categoria: string): boolean {
    const grupo = this.herramientasPorCategoria.find((g) => g.categoria === categoria);
    return grupo?.items.some((h) => this.herramientaSeleccionada(h.id)) ?? false;
  }

  toggleHerramientasCategoriaNoAplica(categoria: string): void {
    if (this.herramientasNoAplica.has(categoria)) {
      this.herramientasNoAplica.delete(categoria);
    } else {
      this.herramientasNoAplica.add(categoria);
      // Desmarca cualquier herramienta de esa categoría ya elegida — "no aplica" es una decisión
      // explícita, no debe convivir con selecciones a medio hacer de antes de marcarla.
      const grupo = this.herramientasPorCategoria.find((g) => g.categoria === categoria);
      grupo?.items.forEach((h) => this.herramientasMarcadas.delete(h.id));
    }
    this.cdr.markForCheck();
  }

  agregarHerramientaPersonalizada(): void {
    const texto = this.nuevaHerramientaTexto.trim();
    if (!texto) return;
    this.herramientasPersonalizadas.push(texto);
    this.nuevaHerramientaTexto = '';
    this.cdr.markForCheck();
  }

  quitarHerramientaPersonalizada(index: number): void {
    this.herramientasPersonalizadas.splice(index, 1);
    this.cdr.markForCheck();
  }

  /** Precarga el wizard con los datos de un ATS ya FIRMADO (?corregir=id) — la condición real en
   *  campo resultó distinta a la evaluada. Guarda como un ATS nuevo enlazado (atsAnteriorId),
   *  nunca modifica el original: un ATS firmado es inmutable (Art. 76 del Reglamento de la Ley
   *  29783). El trabajador solo ajusta lo que cambió antes de firmar de nuevo. */
  private cargarParaCorregir(atsId: number, comoBorrador = false): void {
    this.svc.getPorId(atsId).subscribe({
      next: (original) => {
        if (comoBorrador) this.atsId = atsId;
        this.proyectoId = original.proyectoId;
        this.actividad = original.actividad;
        this.lugar = original.lugar ?? '';
        this.esExterior = !original.torreNombre;
        if (original.torreNombre) {
          this.projectService.getTorres(original.proyectoId).subscribe({
            next: (torres) => {
              this.torres = torres;
              this.torreNombre = original.torreNombre ?? null;
              const labelsOriginal = (original.pisos ?? '').split(',').map((s) => s.trim()).filter(Boolean);
              this.nivelesSeleccionados = new Set(
                this.nivelesDeTorreActual.filter((n) => labelsOriginal.includes(n.label)).map((n) => n.id),
              );
              this.cdr.detectChanges();
            },
            error: () => {},
          });
        }

        for (const p of original.pasos) {
          if (p.pasoId) {
            this.pasosMarcados.set(p.pasoId, p.aplica);
            continue;
          }
          // Paso "de una sola vez" del original — se reintroduce como personalizado bajo la
          // misma categoría (por nombre), si esa categoría sigue existiendo en el catálogo.
          const cat = (this.init?.pasos ?? []).find((c) => c.nombre === p.categoriaNombre);
          if (cat) {
            const lista = this.pasosPersonalizados.get(cat.id) ?? [];
            lista.push({ tempId: this.siguienteTempId--, texto: p.texto });
            this.pasosPersonalizados.set(cat.id, lista);
          }
        }

        const eppPorNombre = new Map((this.init?.epps ?? []).map((e) => [e.nombre, e.id]));
        original.epps.forEach((nombre) => {
          const id = eppPorNombre.get(nombre);
          if (id) this.eppsMarcados.add(id);
        });

        const herramientaPorNombre = new Map((this.init?.herramientas ?? []).map((h) => [h.nombre, h.id]));
        original.herramientas.forEach((nombre) => {
          const id = herramientaPorNombre.get(nombre);
          if (id) this.herramientasMarcadas.add(id);
          else this.herramientasPersonalizadas.push(nombre);
        });

        this.riesgosSeleccionados = original.riesgos.map((r) => ({
          peligroId: r.peligroId,
          riesgoId: r.riesgoId,
          peligroNombre: r.peligroNombre,
          riesgoNombre: r.riesgoNombre,
          riesgoBase: r.riesgoBase,
          controles: r.controles,
          riesgoResidual: r.riesgoResidual,
        }));

        if (original.plantillaId) this.onPlantillaChange(original.plantillaId);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Torre + pisos ────────────────────────────────────────────────

  onProyectoChange(proyectoId: number | null): void {
    this.proyectoId = proyectoId;
    this.torres = [];
    this.torreNombre = null;
    this.nivelesSeleccionados.clear();
    this.esExterior = false;
    this.cdr.markForCheck();
    if (proyectoId) this.cargarTorres(proyectoId);
  }

  private cargarTorres(proyectoId: number): void {
    this.projectService.getTorres(proyectoId).subscribe({
      next: (torres) => {
        this.torres = torres;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  get nivelesDeTorreActual(): NivelTorreOpcion[] {
    const torre = this.torres.find((t) => t.nombre === this.torreNombre);
    return torre ? nivelesDeTorre(torre) : [];
  }

  onTorreChange(nombre: string | null): void {
    this.torreNombre = nombre;
    this.nivelesSeleccionados.clear();
    this.cdr.markForCheck();
  }

  nivelSeleccionado(id: string): boolean {
    return this.nivelesSeleccionados.has(id);
  }

  toggleNivel(id: string): void {
    if (this.nivelesSeleccionados.has(id)) this.nivelesSeleccionados.delete(id);
    else this.nivelesSeleccionados.add(id);
    this.cdr.markForCheck();
  }

  get todosNivelesMarcados(): boolean {
    const niveles = this.nivelesDeTorreActual;
    return niveles.length > 0 && niveles.every((n) => this.nivelSeleccionado(n.id));
  }

  toggleTodosNiveles(): void {
    if (this.todosNivelesMarcados) this.nivelesSeleccionados.clear();
    else this.nivelesDeTorreActual.forEach((n) => this.nivelesSeleccionados.add(n.id));
    this.cdr.markForCheck();
  }

  setEsExterior(valor: boolean): void {
    this.esExterior = valor;
    this.torreNombre = null;
    this.nivelesSeleccionados.clear();
    this.cdr.markForCheck();
  }

  /** "Piso 3, Piso 4" — lo que viaja al backend en AtsGuardarRequestDto.pisos. */
  private get pisosTexto(): string | undefined {
    if (this.esExterior || !this.torreNombre) return undefined;
    const niveles = this.nivelesDeTorreActual;
    const labels = niveles.filter((n) => this.nivelSeleccionado(n.id)).map((n) => n.label);
    return labels.length > 0 ? labels.join(', ') : undefined;
  }

  // ── Plantilla: aplica EPP/herramientas sugeridos, no fuerza riesgos ──

  onPlantillaChange(plantillaId: number | null): void {
    this.plantillaId = plantillaId;

    this.actividadesPlantilla = [];
    this.actividadPasosMarcados.clear();

    // Al elegir (o cambiar de) plantilla, el EPP/herramientas sugeridos REEMPLAZAN lo que
    // hubiera precargado — antes se sumaban (quedaba EPP de la plantilla anterior mezclado con
    // la nueva). Lo que el trabajador marcó a mano en el catálogo general, fuera de lo que
    // sugiere cualquier plantilla, no se toca.
    this.eppsMarcados.clear();
    this.herramientasMarcadas.clear();

    const plantilla = this.init?.plantillas.find((p) => p.id === plantillaId);
    if (!plantilla) { this.cdr.markForCheck(); return; }
    plantilla.eppIds.forEach((id) => this.eppsMarcados.add(id));
    plantilla.herramientaIds.forEach((id) => this.herramientasMarcadas.add(id));
    this.cdr.markForCheck();

    if (!plantillaId) return;
    this.loadingActividadesPlantilla = true;
    this.svc.getActividadesDePlantilla(plantillaId).subscribe({
      next: (lista) => {
        this.actividadesPlantilla = lista;
        this.loadingActividadesPlantilla = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingActividadesPlantilla = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Oculta actividades cuyo texto repite el nombre de una categoría genérica ya mostrada más
   *  abajo (pasa en plantillas como "ATS Supervisión", cuyo Excel de origen repite literalmente
   *  nombres de categoría como si fueran actividades) — evita mostrar el mismo texto dos veces. */
  get actividadesPlantillaFiltradas(): AtsPlantillaActividadDto[] {
    const normalizar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const nombresCategoriasGenericas = new Set((this.init?.pasos ?? []).map((c) => normalizar(c.nombre)));
    return this.actividadesPlantilla.filter((a) => !nombresCategoriasGenericas.has(normalizar(a.texto)));
  }

  actividadPasoAplica(pasoId: number): boolean {
    return this.actividadPasosMarcados.has(pasoId);
  }

  toggleActividadPaso(pasoId: number): void {
    if (this.actividadPasosMarcados.has(pasoId)) this.actividadPasosMarcados.delete(pasoId);
    else this.actividadPasosMarcados.add(pasoId);
    this.cdr.markForCheck();
  }

  todosMarcadosEnActividad(pasos: { id: number }[]): boolean {
    return pasos.length > 0 && pasos.every((p) => this.actividadPasoAplica(p.id));
  }

  toggleTodosActividad(pasos: { id: number }[]): void {
    const marcarTodos = !this.todosMarcadosEnActividad(pasos);
    pasos.forEach((p) => (marcarTodos ? this.actividadPasosMarcados.add(p.id) : this.actividadPasosMarcados.delete(p.id)));
    this.cdr.markForCheck();
  }

  peligroSugeridoPorPlantilla(peligroId: number): boolean {
    const plantilla = this.init?.plantillas.find((p) => p.id === this.plantillaId);
    return plantilla?.peligroIds.includes(peligroId) ?? false;
  }

  /** Si eligieron plantilla, el paso 2 arranca mostrando SOLO sus peligros (evita la lista
   *  completa de 40+ peligros de todas las especialidades mezclados) — "Ver todo el catálogo"
   *  destapa el resto para cuando el trabajador identifica algo fuera de lo típico de su tarea. */
  mostrarTodosLosPeligros = false;

  get peligrosVisiblesEnPaso2(): AtsPeligroDto[] {
    const todos = this.init?.peligros ?? [];
    if (!this.plantillaId || this.mostrarTodosLosPeligros) return todos;
    const plantilla = this.init?.plantillas.find((p) => p.id === this.plantillaId);
    if (!plantilla) return todos;
    const idsPlantilla = new Set(plantilla.peligroIds);
    // Un peligro ya marcado (aunque no sea de la plantilla) se sigue mostrando — si no, al
    // tildar "Ver todo el catálogo" y volver a ocultarlo desaparecería sin desmarcarse solo.
    const idsSeleccionados = new Set(this.riesgosSeleccionados.map((r) => r.peligroId));
    return todos.filter((p) => idsPlantilla.has(p.id) || idsSeleccionados.has(p.id));
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
    const lugarValido = this.torres.length === 0 || this.esExterior || (!!this.torreNombre && this.nivelesSeleccionados.size > 0);
    return !!(this.proyectoId && this.actividad.trim() && lugarValido);
  }

  /** El checklist universal ("Trabajos de gabinete" + "Supervisión y liberación en campo") sale
   *  siempre, sin importar la Plantilla — cubre todo lo de campo (incluye andamio colgante,
   *  plataforma voladiza, andamio multidireccional/Acrow, elevador, PETAR, liberaciones, etc.)
   *  para cualquier puesto. Las actividades de la Plantilla (cuando existen, ej. "Encofrado de
   *  losa" en Albañilería) se muestran ADEMÁS, nunca en reemplazo — son cosas distintas. */
  get categoriasGenericasVisibles() {
    return this.init?.pasos ?? [];
  }

  /** Dentro de una categoría, separa los ítems de rutina de los de trabajo de alto riesgo
   *  (requiere PETAR: andamios, elevador, anclajes) — mismo checklist, solo agrupado para que
   *  no se pierdan entre lo que aplica todos los días y lo que solo aplica si hay ese riesgo. */
  subgruposDePasos(cat: { pasos: { id: number; texto: string; requierePetar: boolean }[] }) {
    const petar = cat.pasos.filter((p) => p.requierePetar);
    if (petar.length === 0) return [{ titulo: null, pasos: cat.pasos }];
    return [
      { titulo: null, pasos: cat.pasos.filter((p) => !p.requierePetar) },
      { titulo: 'Trabajos de alto riesgo (requiere PETAR)', pasos: petar },
    ];
  }

  get usaActividadesPlantilla(): boolean {
    return !!this.plantillaId && this.actividadesPlantillaFiltradas.length > 0;
  }

  /** Cada categoría de "Actividades y pasos de la tarea" debe quedar resuelta: o marcada
   *  "No aplica", o con al menos un paso (del catálogo o agregado a mano) marcado — así no
   *  se puede avanzar a Peligros y riesgos habiendo dejado el checklist entero en blanco. */
  get pasosValidos(): boolean {
    const genericoValido = this.categoriasGenericasVisibles.every((cat) => {
      if (this.categoriaNoAplica(cat.id)) return true;
      return cat.pasos.some((p) => this.pasoAplica(p.id)) || this.pasosPersonalizadosDe(cat.id).length > 0;
    });
    if (this.usaActividadesPlantilla) {
      const actividadesValidas = this.actividadesPlantillaFiltradas.some((act) =>
        act.pasos.some((p) => this.actividadPasoAplica(p.id)),
      );
      return genericoValido && actividadesValidas;
    }
    return genericoValido;
  }

  get riesgosValidos(): boolean {
    return this.riesgosSeleccionados.length > 0;
  }

  /** Agrega un control sugerido como línea nueva — ya es texto completo (ej. "No cargar más
   *  de 25 kg"), no un prefijo a completar: el trabajador puede usarlo tal cual o editarlo. */
  agregarControlSugerido(r: RiesgoSeleccionado, texto: string): void {
    const actual = r.controles.trimEnd();
    r.controles = actual ? `${actual}\n${texto}` : texto;
  }

  get valoracionValida(): boolean {
    return this.riesgosSeleccionados.every((r) => r.riesgoBase && r.controles.trim() && r.riesgoResidual);
  }

  /** Lista en texto plano de lo que falta para poder avanzar — antes el botón "Siguiente"
   *  simplemente quedaba deshabilitado sin decir por qué, y con varias secciones (torre/piso,
   *  categorías genéricas, actividades de plantilla) no era obvio cuál faltaba. */
  get faltantesPaso1(): string[] {
    const faltan: string[] = [];
    if (!this.proyectoId) faltan.push('Selecciona el proyecto.');
    if (!this.actividad.trim()) faltan.push('Escribe la actividad a realizar.');
    if (this.torres.length > 0 && !this.esExterior && !this.torreNombre) faltan.push('Selecciona la torre.');
    if (this.torres.length > 0 && !this.esExterior && this.torreNombre && this.nivelesSeleccionados.size === 0) {
      faltan.push('Marca al menos un piso/nivel.');
    }
    for (const cat of this.categoriasGenericasVisibles) {
      if (this.categoriaNoAplica(cat.id)) continue;
      const tieneAlgo = cat.pasos.some((p) => this.pasoAplica(p.id)) || this.pasosPersonalizadosDe(cat.id).length > 0;
      if (!tieneAlgo) faltan.push(`"${cat.nombre}": marca al menos un paso o "No aplica".`);
    }
    if (this.usaActividadesPlantilla) {
      const tieneAlgo = this.actividadesPlantillaFiltradas.some((act) => act.pasos.some((p) => this.actividadPasoAplica(p.id)));
      if (!tieneAlgo) faltan.push('Marca al menos un paso en las actividades de la plantilla elegida.');
    }
    return faltan;
  }

  irAPeligros(): void {
    if (!this.datosBasicosValidos || !this.pasosValidos) return;
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
    const pasosCatalogo = Array.from(this.pasosMarcados.entries()).map(([pasoId, aplica]) => ({ pasoId, aplica }));

    const pasosPersonalizados = (this.init?.pasos ?? []).flatMap((cat) =>
      this.pasosPersonalizadosDe(cat.id).map((p) => ({
        texto: p.texto,
        categoriaNombre: cat.nombre,
        aplica: true,
      })),
    );

    const pasosDeActividades = this.actividadesPlantillaFiltradas.flatMap((act) =>
      act.pasos
        .filter((p) => this.actividadPasoAplica(p.id))
        .map((p) => ({ texto: p.texto, categoriaNombre: act.texto, aplica: true })),
    );

    return {
      proyectoId: this.proyectoId!,
      plantillaId: this.plantillaId ?? undefined,
      actividad: this.actividad.trim(),
      torreNombre: this.esExterior ? undefined : this.torreNombre || undefined,
      pisos: this.pisosTexto,
      lugar: this.lugar.trim() || undefined,
      pasos: [...pasosCatalogo, ...pasosPersonalizados, ...pasosDeActividades],
      eppIds: Array.from(this.eppsMarcados),
      herramientaIds: Array.from(this.herramientasMarcadas),
      herramientasPersonalizadas: this.herramientasPersonalizadas,
      riesgos: this.riesgosSeleccionados.map((r) => ({
        peligroId: r.peligroId,
        riesgoId: r.riesgoId,
        riesgoBase: r.riesgoBase as NivelRiesgo,
        controles: r.controles.trim(),
        riesgoResidual: r.riesgoResidual as NivelRiesgo,
      })),
      atsAnteriorId: this.atsAnteriorId ?? undefined,
    };
  }

  siguiente(): void {
    if (!this.valoracionValida || this.saving) return;

    if (this.modoGrupal) {
      this.crearGrupo();
      return;
    }

    this.saving = true;
    this.loaderService.show();

    const dto = this.buildDto();

    const alGuardar = () => {
      this.saving = false;
      this.loaderService.hide();
      this.paso = 4;
      this.pedirUbicacion();
      this.cargarFirmaGuardada();
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

  private crearGrupo(): void {
    if (this.creandoGrupo) return;
    this.creandoGrupo = true;
    this.loaderService.show();
    this.svc.crearGrupo(this.buildDto()).subscribe({
      next: (res) => {
        this.creandoGrupo = false;
        this.loaderService.hide();
        this.router.navigate(['/ssoma/gestion/ats/grupo', res.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.creandoGrupo = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
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

  /** Trae (en segundo plano, sin aplicarla todavía) una firma ya registrada — primero la firma
   *  digital que el Coordinador SSOMA ya le capturó para la Autorización de uso de firma
   *  (SSO-FO-151, la misma que exige tener antes de poder crear cualquier ATS), y si no existe,
   *  cae a la firma general de Contabilidad/Gestión Administrativa ("Tu firma"). NO se aplica
   *  sola: el lienzo arranca en blanco y el trabajador decide con el botón "Usar firma digital
   *  autorizada y validada" — nada de firmar en automático sin que la persona lo pida. */
  private cargarFirmaGuardada(): void {
    this.svc.getMiFirmaDigitalAutorizacionImagenBlob().subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : null;
          if (!dataUrl) { this.cargarFirmaPersonal(); return; }
          this.firmaGuardada = { tipo: 'DIBUJO', imageDataUrl: dataUrl };
          this.cdr.detectChanges();
        };
        reader.onerror = () => this.cargarFirmaPersonal();
        reader.readAsDataURL(blob);
      },
      // 404 = todavía no capturó firma digital autorizada — cae a la firma personal general.
      error: () => this.cargarFirmaPersonal(),
    });
  }

  private cargarFirmaPersonal(): void {
    this.firmaPersonalSvc.get().subscribe({
      next: (res) => {
        this.firmaGuardada = res.firmas.find((f) => f.tipo === 'DIBUJO') ?? res.firmas[0] ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.firmaGuardada = null;
        this.cdr.detectChanges();
      },
    });
  }


  usarFirmaGuardada(): void {
    if (!this.firmaGuardada) return;
    this.usandoFirmaGuardada = true;
  }

  dibujarFirmaNueva(): void {
    this.usandoFirmaGuardada = false;
    this.firmaPad?.clear();
  }

  /** true si alguno de los riesgos marcados exige PETAR (catálogo, Plantillas → Riesgos) — el
   *  PETAR solo se puede generar sobre un ATS ya Firmado, así que esto NO bloquea la firma, solo
   *  decide si redirigimos a "Generar PETAR" apenas se firma en vez de cerrar el wizard. */
  private get tieneRiesgoQueRequierePetar(): boolean {
    const riesgosDelCatalogo = (this.init?.peligros ?? []).flatMap((p) => p.riesgos);
    return this.riesgosSeleccionados.some((sel) => riesgosDelCatalogo.find((r) => r.id === sel.riesgoId)?.requierePetar);
  }

  get puedeFirmar(): boolean {
    const hayAlgunaFirma = this.usandoFirmaGuardada ? !!this.firmaGuardada : this.hayFirma;
    return this.camaraLista && hayAlgunaFirma && this.aceptaConsentimiento && !this.firmando;
  }

  firmar(): void {
    if (!this.puedeFirmar || !this.atsId || !this.camara) return;

    const foto = this.camara.capturarFoto();
    const firma = this.usandoFirmaGuardada ? (this.firmaGuardada?.imageDataUrl ?? null) : this.firmaPad?.toDataUrl();
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

        if (this.tieneRiesgoQueRequierePetar) {
          Swal.fire({
            icon: 'warning',
            title: 'ATS firmado — falta el PETAR',
            text: 'Identificaste un riesgo que exige Permiso de Trabajo de Alto Riesgo. Ahora que el ATS ya está firmado, te llevamos a llenarlo.',
            confirmButtonText: 'Generar PETAR ahora',
          }).then(() => this.router.navigate(['/ssoma/gestion/petar/nuevo'], { queryParams: { atsId: this.atsId } }));
          return;
        }

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
