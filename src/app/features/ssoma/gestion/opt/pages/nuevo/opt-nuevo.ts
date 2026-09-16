import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { forkJoin } from 'rxjs';
import { OptService } from '../../services/opt.service';
import { PetsService } from '../../../pets/pets.service';
import {
  OptPetDto,
  OptCriterioVerificacionDto,
  CrearOptRequest,
  OptTrabajadorRequest,
  OptVerificacionRequest,
  OptPasoRequest,
} from '../../dtos/opt.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../../../../salud-ocupacional/shared/worker-search-input/worker-search-input';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../../shared/components/photo-grid-picker/photo-grid-picker';
import Swal from 'sweetalert2';

interface TrabajadorForm {
  trabajador: WorkerSearchItemDto;
  tipoTrabajador: string;
  tiempoEnObra: string;
  aniosExperiencia: string;
  firmaBase64: string;
  // Si el trabajador ya venía de un borrador guardado, esta es la firma que ya
  // subimos antes — se muestra tal cual hasta que el usuario decida "Volver a
  // firmar" (recién ahí se habilita el canvas y se manda una nueva en base64).
  firmaUrlExistente: string;
  refirmar: boolean;
}

interface VerificacionForm {
  criterioId: number;
  pregunta: string;
  orden: number;
  resultado: boolean;
}

// Nodo del paso a paso observado — calca la jerarquía del PETS (subtitulo/paso) para
// poder agrupar y colapsar por subtítulo, igual que ya se edita en PETS.
interface PasoForm {
  id: number;
  numeroDisplay: string;
  descripcion: string;
  tipo: string; // 'subtitulo' | 'paso' (heredado del PETS)
  nivel: number;
  resultado: string; // '' | 'Seguro' | 'Inseguro' | 'MejorPractica' | 'NA'
  desviacionObservada: string;
  // true = actividad real observada que el PETS no contemplaba (agregada a mano).
  esNoContemplado: boolean;
  // true = esta fila la agregó el observador a mano (paso suelto o "actividad no
  // contemplada") — solo estas se pueden quitar. Un paso/subtítulo que vino del
  // catálogo del PETS nunca se borra: si no aplica, se marca "No aplica" (así queda
  // constancia de que sí se revisó, en vez de desaparecer del reporte).
  esManual: boolean;
}

@Component({
  selector: 'app-opt-nuevo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SearchSelect,
    WorkerSearchInput,
    DocumentViewer,
    AbrilModalPanel,
    PhotoGridPicker,
  ],
  templateUrl: './opt-nuevo.html',
  styleUrl: './opt-nuevo.css',
})
export class OptNuevo implements OnInit, AfterViewInit {
  paso = 1;
  readonly totalPasos = 4;
  readonly pasoLabels = ['Observación', 'Pasos observados', 'Retroalimentación', 'Trabajadores'];
  guardando = false;
  guardandoBorrador = false;
  loadingCatalogos = false;

  // Si viene un :id en la ruta, se está retomando un borrador ya creado — cada
  // "Siguiente" y el guardado final pegan por PUT contra este id en vez de crear
  // uno nuevo por POST.
  optId: number | null = null;
  cargandoBorrador = false;

  // Catálogos
  pets: OptPetDto[] = [];
  criterios: OptCriterioVerificacionDto[] = [];
  proyectos: any[] = [];
  petSeleccionado: OptPetDto | null = null;
  // PASO 1
  proyectoId: number | null = null;
  petId: number | null = null;
  fecha = new Date().toISOString().split('T')[0];
  tipoObservacion = '';
  area = '';
  seInformaTrabajador = false;
  observadorNombre = '';
  observadorCargo = '';
  petVisorUrl = '';
  petVisorNombre = '';

  // Observador — fijo, resuelto desde el usuario logueado (no editable). En modo
  // "retomar borrador" se respeta el observador que ya había quedado guardado.
  observadorId: number | null = null;
  observadorActual: WorkerSearchItemDto | null = null;
  resolviendoObservador = true;
  sinWorkerVinculado = false;

  // PASO 2 — pasos observados (+ fotos de la actividad, documentan lo observado)
  pasos: PasoForm[] = [];
  pasoNextId = 1;
  subtitulosColapsados = new Set<number>();
  nuevaActividadTexto = '';
  fotosAreaBase64: string[] = [];
  fotosAreaPreview: string[] = [];
  // Fotos que ya estaban subidas de un guardado de borrador anterior (URLs, no
  // base64) — se muestran de referencia, no se vuelven a mandar ni se pueden borrar
  // desde acá todavía.
  fotosAreaExistentes: string[] = [];
  // Cuenta las que se subieron en ESTA sesión de edición pero cuya URL real no
  // conocemos (crear/actualizar no la devuelve) — solo para el mínimo de 3, no se
  // pueden mostrar como miniatura todavía.
  private fotosNuevasYaGuardadas = 0;

  // PASO 3 — retroalimentación
  seFelicito = false;
  seRecibieronComentarios = false;
  seRetroalimento = false;
  seObtuvoCCompromiso = false;
  // "Sobre el PETS" (Elaborar/Modificar/Mantener) es de UNA sola a la vez — o no hay
  // PETS, o el que hay está bien, o necesita cambios; nunca dos a la vez. Entrenamiento
  // es un eje aparte (sobre el TRABAJADOR, no sobre el documento) y puede darse junto
  // con cualquiera de las tres — el PETS puede estar perfecto y aun así este
  // trabajador puntual necesitar entrenamiento.
  accionPetsSeleccionada: string | null = null;
  requiereEntrenamiento = false;
  accionObservacion = '';
  private sugerenciaYaAplicada = false;

  // PASO 4 — trabajadores + verificación de entrenamiento + firmas
  trabajadores: TrabajadorForm[] = [];
  verificaciones: VerificacionForm[] = [];
  @ViewChild('buscadorTrabajador') buscadorTrabajador?: WorkerSearchInput;

  // Canvas observador
  @ViewChild('canvasObs') canvasObs!: ElementRef<HTMLCanvasElement>;
  private ctxObs?: CanvasRenderingContext2D;
  private drawingObs = false;
  firmaObsBase64 = '';
  // Firma que ya venía guardada del borrador — igual que con los trabajadores, se
  // muestra tal cual hasta que se pide "Volver a firmar".
  firmaObsUrlExistente = '';
  refirmarObservador = false;

  // Canvases trabajadores
  @ViewChildren('canvasTrab') canvasTrabList!: QueryList<ElementRef<HTMLCanvasElement>>;
  private ctxTrab: Map<number, CanvasRenderingContext2D> = new Map();
  private drawingTrabId: number | null = null;
  firmasTrabBase64: Map<number, string> = new Map();

  readonly tiposTrabajador = ['Obrero', 'Operario', 'Capataz', 'Técnico', 'Ingeniero', 'Supervisor', 'Otro'];
  // "Modificar el PETS" cubre tanto "ampliar con lo no contemplado" como "actualizar
  // con una mejor práctica encontrada" — no hace falta separarlas, ambas terminan en
  // la misma revisión de SSOMA.
  readonly accionesPetsDisponibles = ['Elaborar el PETS', 'Modificar el PETS', 'Mantener el PETS'];
  readonly tiposObservacion = [
    { value: 'Planeada', label: 'Planeada' },
    { value: 'No Planeada', label: 'No Planeada' },
  ];

  constructor(
    private optService: OptService,
    private petsService: PetsService,
    private projectService: ProjectService,
    private workerSearchService: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.optId = idParam ? Number(idParam) : null;

    this.loadingCatalogos = true;
    forkJoin({
      catalogos: this.optService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
    }).subscribe({
      next: ({ catalogos, proyectos }) => {
        this.pets = catalogos.pets;
        this.criterios = catalogos.criterios;
        this.proyectos = proyectos.data;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();

        if (this.optId) {
          this.cargarBorrador(this.optId);
        } else {
          this.verificaciones = catalogos.criterios.map((c) => ({
            criterioId: c.id,
            pregunta: c.pregunta,
            orden: c.orden,
            resultado: false,
          }));
          this.resolverObservadorActual();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // Trae un borrador ya creado y precarga los 4 pasos del wizard con lo que ya se
  // había guardado — "Continuar llenando" desde la lista cae acá.
  private cargarBorrador(id: number): void {
    this.cargandoBorrador = true;
    this.optService.getDetalle(id).subscribe({
      next: (d) => {
        if (d.estado !== 'borrador') {
          Swal.fire({ icon: 'info', title: 'Esta OPT ya fue finalizada', text: 'Una OPT finalizada no se puede editar.' })
            .then(() => this.router.navigate(['/ssoma/gestion/opt', id]));
          return;
        }

        this.proyectoId = d.proyectoId;
        this.petId = d.petId ?? null;
        this.petSeleccionado = this.pets.find((p) => p.id === this.petId) ?? null;
        this.fecha = d.fecha.split('T')[0];
        this.tipoObservacion = d.tipoObservacion;
        this.area = d.area ?? '';
        this.seInformaTrabajador = d.seInformaTrabajador;

        // El observador queda tal cual se guardó — no se vuelve a resolver desde el
        // usuario logueado (puede que otra persona esté retomando el llenado).
        this.observadorId = d.observadorId ?? null;
        this.observadorNombre = d.observadorNombre ?? '';
        this.observadorCargo = d.observadorCargo ?? '';
        this.firmaObsUrlExistente = d.firmaObservadorUrl ?? '';
        this.resolviendoObservador = false;
        this.sinWorkerVinculado = false;

        this.verificaciones = this.criterios.map((c) => {
          const existente = d.verificaciones.find((v) => v.criterioId === c.id);
          return { criterioId: c.id, pregunta: c.pregunta, orden: c.orden, resultado: existente?.resultado ?? false };
        });

        this.pasos = d.pasos.map((p) => ({
          id: this.pasoNextId++,
          numeroDisplay: p.numeroDisplay,
          descripcion: p.descripcion,
          tipo: p.tipo,
          nivel: p.nivel,
          resultado: p.resultado ?? '',
          desviacionObservada: p.desviacionObservada ?? '',
          esNoContemplado: p.esNoContemplado,
          esManual: p.esManual,
        }));
        this.colapsarTodosLosSubtitulos();

        this.fotosAreaExistentes = [...d.fotosArea];

        this.seFelicito = d.seFelicito;
        this.seRecibieronComentarios = d.seRecibieronComentarios;
        this.seRetroalimento = d.seRetroalimento;
        this.seObtuvoCCompromiso = d.seObtuvoCCompromiso;
        const accionesGuardadas = d.accionRequerida
          ? d.accionRequerida.split(',').map((a) => a.trim()).filter((a) => a)
          : [];
        this.requiereEntrenamiento = accionesGuardadas.includes('Entrenamiento');
        this.accionPetsSeleccionada = accionesGuardadas.find((a) => a !== 'Entrenamiento') ?? null;
        this.sugerenciaYaAplicada = accionesGuardadas.length > 0;
        this.accionObservacion = d.accionObservacion ?? '';

        this.trabajadores = d.trabajadores.map((t) => ({
          trabajador: {
            id: t.trabajadorId,
            apellidoNombre: t.nombreTrabajador,
            dni: t.dni ?? '',
            puesto: t.tipoTrabajador,
            empresaActual: t.empresaNombre,
            activo: true,
          },
          tipoTrabajador: t.tipoTrabajador ?? '',
          tiempoEnObra: t.tiempoEnObra ?? '',
          aniosExperiencia: t.aniosExperiencia ?? '',
          firmaBase64: '',
          firmaUrlExistente: t.firmaTrabajadorUrl ?? '',
          refirmar: false,
        }));
        for (const t of this.trabajadores) this.firmasTrabBase64.set(t.trabajador.id, '');

        this.cargandoBorrador = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoBorrador = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * El Observador ya no es un campo editable: se resuelve siempre desde el trabajador
   * vinculado al usuario logueado (Abril vía Person, contratista vía ss_contratista_usuario).
   * Si no hay vínculo, se bloquea el formulario completo.
   */
  private resolverObservadorActual(): void {
    this.resolviendoObservador = true;
    this.workerSearchService.getMe().subscribe({
      next: (me) => {
        this.observadorActual = me;
        this.sinWorkerVinculado = false;
        this.resolviendoObservador = false;
        this.observadorId = me.id;
        this.observadorNombre = me.apellidoNombre;
        this.observadorCargo = me.cargo || me.puesto || '';
        this.cdr.markForCheck();
      },
      error: () => {
        this.observadorActual = null;
        this.sinWorkerVinculado = true;
        this.resolviendoObservador = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {}

  // ── PET ───────────────────────────────────────────────────────────────────

  // Los PETS de Abril son globales (aparecen siempre); los de contratista solo se
  // ofrecen si pertenecen al proyecto ya elegido — evita mezclar el PETS de un
  // contratista con obras donde no aplica.
  get petsDisponibles(): (OptPetDto & { nombreMostrado: string })[] {
    return this.pets
      .filter((p) => p.origen === 'Abril' || p.proyectoId === Number(this.proyectoId))
      .map((p) => ({
        ...p,
        nombreMostrado: p.origen === 'Contratista' ? `${p.nombre} (${p.contributorNombre ?? 'Contratista'})` : p.nombre,
      }));
  }

  // "¿Se cuenta con PETS?" ya no se toca a mano: se deriva 100% de si hay un PETS
  // seleccionado arriba — no tiene sentido que alguien marque "Sí" sin haber elegido
  // ninguno, ni "No" habiendo elegido uno.
  get cuentaConPet(): boolean {
    return !!this.petId;
  }

  onPetChange(): void {
    const anterior = this.petSeleccionado;
    this.petSeleccionado = this.pets.find((p) => p.id === Number(this.petId)) ?? null;
    this.petVisorUrl = '';
    this.petVisorNombre = '';
    this.cdr.markForCheck();

    if (this.petSeleccionado) {
      if (this.pasos.length > 0) {
        Swal.fire({
          icon: 'question',
          title: 'Reemplazar pasos',
          text: `¿Traer los pasos de "${this.petSeleccionado.nombre}"? Esto reemplaza los ${this.pasos.length} paso(s) que ya tienes en la lista.`,
          showCancelButton: true,
          confirmButtonText: 'Sí, traer pasos',
          cancelButtonText: 'No, mantener los míos',
        }).then((res) => {
          if (res.isConfirmed) this.cargarPasosDelPet(this.petSeleccionado!.id);
        });
      } else {
        this.cargarPasosDelPet(this.petSeleccionado.id);
      }
      return;
    }

    // Se quitó el PETS (estaba elegido y ahora queda "Sin PETS registrado"): los
    // pasos que se habían traído de SU catálogo ya no tienen sentido acá — dejarlos
    // es justo lo que hacía parecer "el PETS sigue marcado" aunque ya no lo esté.
    if (anterior && this.pasos.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Quitaste el PETS asociado',
        text: `Los ${this.pasos.length} paso(s) que trajiste de "${anterior.nombre}" ya no aplican — se van a borrar. Puedes seguir agregando pasos a mano.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, borrarlos',
        cancelButtonText: 'No, mantenerlos',
      }).then((res) => {
        if (res.isConfirmed) {
          this.pasos = [];
          this.subtitulosColapsados.clear();
          this.cdr.markForCheck();
        }
      });
    }
  }

  // Trae automáticamente los pasos del catálogo del PETS seleccionado — así OPT
  // deja de requerir tipear a mano el "paso a paso" cada vez que se observa una
  // tarea que ya tiene un PETS estructurado en la plataforma. Se conserva el tipo
  // (subtitulo/paso) y el nivel de anidamiento para poder agrupar/colapsar igual
  // que en la pantalla de PETS.
  private cargarPasosDelPet(petId: number): void {
    this.petsService.getPasos(petId).subscribe({
      next: (pasosPet) => {
        if (pasosPet.length === 0) return;
        this.pasos = pasosPet.map((p) => ({
          id: this.pasoNextId++,
          numeroDisplay: '',
          descripcion: p.descripcion,
          tipo: p.tipo,
          nivel: p.nivel,
          resultado: '',
          desviacionObservada: '',
          esNoContemplado: false,
          esManual: false,
        }));
        this.colapsarTodosLosSubtitulos();
        this.renumerarPasos();
        this.cdr.markForCheck();
      },
      error: () => {
        // Sin catálogo de pasos para este PETS todavía: no bloquea — se puede
        // seguir tipeando los pasos a mano como antes.
      },
    });
  }

  private readonly SHAREPOINT_SITE = 'https://abrilinmob.sharepoint.com/sites/SSOMA-Powerapps/';

  abrirVisorPet(): void {
    if (!this.petSeleccionado?.sharepointUrl) return;
    let path = this.petSeleccionado.sharepointUrl;
    if (path.startsWith(this.SHAREPOINT_SITE)) {
      path = path.slice(this.SHAREPOINT_SITE.length);
    }
    this.petVisorNombre = this.petSeleccionado.nombre;
    this.petVisorUrl = path;
    this.cdr.markForCheck();
  }

  cerrarVisorPet(): void {
    this.petVisorUrl = '';
    this.petVisorNombre = '';
    this.cdr.markForCheck();
  }

  // ── PASOS OBSERVADOS (PASO 2) ─────────────────────────────────────────────
  agregarPaso(): void {
    this.pasos.push({
      id: this.pasoNextId++,
      numeroDisplay: '',
      descripcion: '',
      tipo: 'paso',
      nivel: 0,
      resultado: '',
      desviacionObservada: '',
      esNoContemplado: false,
      esManual: true,
    });
    this.renumerarPasos();
    this.cdr.markForCheck();
  }

  // Actividad real observada que el PETS no contempla — el gap inverso: no es una
  // desviación de un paso existente, es un hueco del propio documento.
  agregarActividadNoContemplada(): void {
    const texto = this.nuevaActividadTexto.trim();
    if (!texto) return;
    this.pasos.push({
      id: this.pasoNextId++,
      numeroDisplay: '',
      descripcion: texto,
      tipo: 'paso',
      nivel: 0,
      resultado: '',
      desviacionObservada: '',
      esNoContemplado: true,
      esManual: true,
    });
    this.nuevaActividadTexto = '';
    this.renumerarPasos();
    this.cdr.markForCheck();
  }

  quitarPaso(id: number): void {
    this.pasos = this.pasos.filter((p) => p.id !== id);
    this.renumerarPasos();
    this.cdr.markForCheck();
  }

  // Los subtítulos y las actividades no contempladas no llevan número correlativo
  // — solo los pasos "reales" del catálogo del PETS se numeran.
  renumerarPasos(): void {
    let contador = 0;
    for (const p of this.pasos) {
      if (p.tipo === 'subtitulo' || p.esNoContemplado) {
        p.numeroDisplay = '';
        continue;
      }
      contador++;
      p.numeroDisplay = String(contador);
    }
  }

  trackPasoId(_: number, p: PasoForm): number {
    return p.id;
  }

  // Por defecto todos los subtítulos arrancan colapsados — en un PETS con muchas
  // secciones, mostrarlas todas expandidas de entrada es una lista larguísima
  // (peor aún en celular, que es como la mayoría va a llenar esto en campo). El
  // observador expande solo la sección de la actividad que realmente está viendo.
  private colapsarTodosLosSubtitulos(): void {
    this.subtitulosColapsados = new Set(this.pasos.filter((p) => p.tipo === 'subtitulo').map((p) => p.id));
  }

  toggleColapso(id: number): void {
    if (this.subtitulosColapsados.has(id)) this.subtitulosColapsados.delete(id);
    else this.subtitulosColapsados.add(id);
    this.cdr.markForCheck();
  }

  // Un paso queda oculto si CUALQUIER subtítulo ancestro (a cualquier nivel hacia
  // arriba, no solo el padre inmediato) está colapsado — se camina hacia atrás en la
  // lista plana buscando el siguiente nivel más superficial en cada paso.
  esPasoVisible(index: number): boolean {
    let techo = this.pasos[index].nivel;
    if (techo === 0) return true;
    for (let i = index - 1; i >= 0; i--) {
      if (this.pasos[i].nivel < techo) {
        if (this.pasos[i].tipo === 'subtitulo' && this.subtitulosColapsados.has(this.pasos[i].id)) return false;
        techo = this.pasos[i].nivel;
        if (techo === 0) break;
      }
    }
    return true;
  }

  onFotoAreaChange(files: FileList): void {
    for (let i = 0; i < files.length && this.fotosAreaBase64.length < 10; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        this.fotosAreaPreview.push(dataUrl);
        this.fotosAreaBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(files[i]);
    }
  }

  quitarFotoArea(idx: number): void {
    this.fotosAreaBase64.splice(idx, 1);
    this.fotosAreaPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  get totalFotos(): number {
    return this.fotosAreaExistentes.length + this.fotosNuevasYaGuardadas + this.fotosAreaBase64.length;
  }

  // ── RETROALIMENTACIÓN (PASO 3) — acción sugerida automáticamente ─────────
  // "Sobre el PETS": una sola a la vez — elegir otra reemplaza la anterior (clic en
  // la ya elegida la deselecciona, dejando la conclusión "sin definir").
  seleccionarAccionPets(a: string): void {
    this.accionPetsSeleccionada = this.accionPetsSeleccionada === a ? null : a;
    this.cdr.markForCheck();
  }

  toggleEntrenamiento(): void {
    this.requiereEntrenamiento = !this.requiereEntrenamiento;
    this.cdr.markForCheck();
  }

  // Se calcula UNA vez, al entrar por primera vez al paso 3 (si el usuario ya la
  // había tocado — yendo y viniendo con Anterior/Siguiente, o retomando un borrador
  // — no se le pisa la elección). El observador siempre puede ajustarla a mano.
  private sugerirAcciones(): void {
    if (this.sugerenciaYaAplicada) return;
    this.sugerenciaYaAplicada = true;
    const evaluables = this.pasos.filter((p) => p.tipo !== 'subtitulo');

    if (!this.petId) {
      this.accionPetsSeleccionada = 'Elaborar el PETS';
    } else if (evaluables.some((p) => p.esNoContemplado || p.resultado === 'MejorPractica')) {
      this.accionPetsSeleccionada = 'Modificar el PETS';
    } else if (evaluables.some((p) => p.resultado === 'Seguro' || p.resultado === 'Inseguro')) {
      this.accionPetsSeleccionada = 'Mantener el PETS';
    } else {
      this.accionPetsSeleccionada = null;
    }

    // Entrenamiento es específico: hay PETS, el paso SÍ está en su catálogo, y aun
    // así el trabajador no lo cumple. Si no hay PETS (o el paso es uno "no
    // contemplado", que por definición no viene del catálogo) no aplica — ahí el
    // problema es el documento, no la persona.
    this.requiereEntrenamiento =
      !!this.petId && evaluables.some((p) => p.resultado === 'Inseguro' && !p.esNoContemplado);
  }

  get requierePetModificacionComputado(): boolean {
    return !!this.petId && this.accionPetsSeleccionada === 'Modificar el PETS';
  }

  // ── TRABAJADORES (PASO 4) ─────────────────────────────────────────────────
  // El buscador queda "pegado" mostrando la tarjeta del seleccionado hasta que se
  // llama a su clear() — acá se limpia enseguida para volver al cuadro de búsqueda
  // y poder agregar al siguiente trabajador sin un paso extra.
  onTrabajadorObservadoSeleccionado(w: WorkerSearchItemDto | null): void {
    if (!w) return;
    this.agregarTrabajador(w);
    this.buscadorTrabajador?.clear();
  }

  agregarTrabajador(w: WorkerSearchItemDto): void {
    if (this.trabajadores.some((t) => t.trabajador.id === w.id)) return;
    this.trabajadores.push({
      trabajador: w,
      tipoTrabajador: w.categoria ?? '',
      tiempoEnObra: this.calcularTiempoEnObra(w.fechaIngreso),
      aniosExperiencia: w.aniosExperiencia?.toString() ?? '',
      firmaBase64: '',
      firmaUrlExistente: '',
      refirmar: false,
    });
    this.firmasTrabBase64.set(w.id, '');
    this.cdr.markForCheck();
  }

  private calcularTiempoEnObra(fechaIngreso?: string): string {
    if (!fechaIngreso) return '';
    const inicio = new Date(fechaIngreso);
    const hoy = new Date();
    const meses = (hoy.getFullYear() - inicio.getFullYear()) * 12
      + (hoy.getMonth() - inicio.getMonth());
    if (meses < 1) return 'Menos de 1 mes';
    if (meses < 12) return `${meses} mes${meses > 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0
      ? `${anios} año${anios > 1 ? 's' : ''} ${resto} mes${resto > 1 ? 'es' : ''}`
      : `${anios} año${anios > 1 ? 's' : ''}`;
  }

  quitarTrabajador(id: number): void {
    this.trabajadores = this.trabajadores.filter((t) => t.trabajador.id !== id);
    this.firmasTrabBase64.delete(id);
    this.cdr.markForCheck();
  }

  refirmarTrabajador(t: TrabajadorForm): void {
    t.refirmar = true;
    this.cdr.markForCheck();
  }

  // ── CANVAS OBSERVADOR ────────────────────────────────────────────────────
  initCanvasObs(): void {
    if (!this.canvasObs) return;
    this.ctxObs = this.canvasObs.nativeElement.getContext('2d')!;
    this.ctxObs.strokeStyle = '#0F6E56';
    this.ctxObs.lineWidth = 2;
    this.ctxObs.lineCap = 'round';
    this.cdr.markForCheck();
  }

  startDrawObs(e: MouseEvent): void {
    if (!this.ctxObs) this.initCanvasObs();
    this.drawingObs = true;
    this.ctxObs!.beginPath();
    this.ctxObs!.moveTo(e.offsetX, e.offsetY);
  }

  drawObs(e: MouseEvent): void {
    if (!this.drawingObs || !this.ctxObs) return;
    this.ctxObs.lineTo(e.offsetX, e.offsetY);
    this.ctxObs.stroke();
  }

  stopDrawObs(): void {
    this.drawingObs = false;
    if (this.canvasObs) {
      this.firmaObsBase64 = this.canvasObs.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawObsTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxObs) this.initCanvasObs();
    const rect = this.canvasObs.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingObs = true;
    this.ctxObs!.beginPath();
    this.ctxObs!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawObsTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingObs || !this.ctxObs) return;
    const rect = this.canvasObs.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxObs.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxObs.stroke();
  }

  clearCanvasObs(): void {
    if (this.canvasObs) {
      const canvas = this.canvasObs.nativeElement;
      this.canvasObs.nativeElement.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      this.firmaObsBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── CANVAS TRABAJADORES ──────────────────────────────────────────────────
  getCanvasTrab(idx: number): HTMLCanvasElement | null {
    const list = this.canvasTrabList?.toArray();
    return list?.[idx]?.nativeElement ?? null;
  }

  initCtxTrab(id: number, idx: number): CanvasRenderingContext2D | null {
    const canvas = this.getCanvasTrab(idx);
    if (!canvas) return null;
    if (!this.ctxTrab.has(id)) {
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#0F6E56';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      this.ctxTrab.set(id, ctx);
    }
    return this.ctxTrab.get(id)!;
  }

  startDrawTrab(e: MouseEvent, id: number, idx: number): void {
    const ctx = this.initCtxTrab(id, idx);
    if (!ctx) return;
    this.drawingTrabId = id;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }

  drawTrab(e: MouseEvent, id: number): void {
    if (this.drawingTrabId !== id) return;
    const ctx = this.ctxTrab.get(id);
    if (!ctx) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  }

  stopDrawTrab(id: number, idx: number): void {
    this.drawingTrabId = null;
    const canvas = this.getCanvasTrab(idx);
    if (canvas) {
      this.firmasTrabBase64.set(id, canvas.toDataURL('image/png').split(',')[1]);
    }
  }

  startDrawTrabTouch(e: TouchEvent, id: number, idx: number): void {
    e.preventDefault();
    const ctx = this.initCtxTrab(id, idx);
    if (!ctx) return;
    const canvas = this.getCanvasTrab(idx)!;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingTrabId = id;
    ctx.beginPath();
    ctx.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawTrabTouch(e: TouchEvent, id: number): void {
    e.preventDefault();
    if (this.drawingTrabId !== id) return;
    const ctx = this.ctxTrab.get(id);
    const canvas = this.canvasTrabList.toArray().find((_, i) => this.trabajadores[i]?.trabajador.id === id);
    if (!ctx || !canvas) return;
    const rect = canvas.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    ctx.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    ctx.stroke();
  }

  clearCanvasTrab(id: number, idx: number): void {
    const canvas = this.getCanvasTrab(idx);
    if (canvas) {
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      this.firmasTrabBase64.set(id, '');
      this.ctxTrab.delete(id);
      this.cdr.markForCheck();
    }
  }

  // ── NAVEGACIÓN WIZARD ────────────────────────────────────────────────────
  get puedeAvanzar(): boolean {
    if (this.sinWorkerVinculado || this.resolviendoObservador) return false;
    switch (this.paso) {
      case 1:
        return (
          (this.proyectoId ?? 0) > 0 &&
          !!this.fecha &&
          !!this.tipoObservacion &&
          !!this.area &&
          !!this.observadorNombre
        );
      default:
        return true;
    }
  }

  // Cada "Siguiente" guarda de inmediato como borrador — así nunca se pierde lo
  // llenado si el usuario se queda a medias en campo (batería, interrupción, etc.).
  siguiente(): void {
    if (!this.validarPaso()) return;
    this.guardarBorrador(() => {
      this.paso++;
      if (this.paso === 3) this.sugerirAcciones();
      if (this.paso === 4) setTimeout(() => this.initCanvasObs(), 100);
      this.cdr.markForCheck();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  anterior(): void {
    this.paso--;
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  validarPaso(): boolean {
    if (this.paso === 1) {
      if (!this.proyectoId || this.proyectoId <= 0) {
        Swal.fire({ icon: 'warning', title: 'Selecciona un proyecto', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.tipoObservacion) {
        Swal.fire({ icon: 'warning', title: 'Selecciona el tipo de observación', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.fecha) {
        Swal.fire({ icon: 'warning', title: 'Ingresa la fecha', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
    }
    return true;
  }

  // ── ARMAR REQUEST (compartido entre borrador y finalizar) ────────────────
  private construirRequest(finalizar: boolean): CrearOptRequest {
    const trabajadoresReq: OptTrabajadorRequest[] = this.trabajadores.map((t) => ({
      trabajadorId: t.trabajador.id,
      tipoTrabajador: t.tipoTrabajador || undefined,
      tiempoEnObra: t.tiempoEnObra || undefined,
      aniosExperiencia: t.aniosExperiencia || undefined,
      firmaTrabajadorBase64: this.firmasTrabBase64.get(t.trabajador.id) || undefined,
    }));

    const verificacionesReq: OptVerificacionRequest[] = this.verificaciones.map((v) => ({
      criterioId: v.criterioId,
      resultado: v.resultado,
    }));

    const pasosReq: OptPasoRequest[] = this.pasos.map((p, i) => ({
      numeroDisplay: p.numeroDisplay,
      descripcion: p.descripcion,
      nivel: p.nivel,
      tipo: p.tipo,
      resultado: p.resultado || undefined,
      desviacionObservada: p.desviacionObservada || undefined,
      esNoContemplado: p.esNoContemplado,
      esManual: p.esManual,
      orden: i + 1,
    }));

    return {
      proyectoId: Number(this.proyectoId ?? 0),
      petId: this.petId ? Number(this.petId) : undefined,
      fecha: this.fecha,
      tipoObservacion: this.tipoObservacion,
      cuentaConPet: this.cuentaConPet,
      area: this.area || undefined,
      seInformaTrabajador: this.seInformaTrabajador,
      observadorId: this.observadorId ?? undefined,
      observadorNombre: this.observadorNombre || undefined,
      observadorCargo: this.observadorCargo || undefined,
      firmaObservadorBase64: this.firmaObsBase64 || undefined,
      seFelicito: this.seFelicito,
      seRecibieronComentarios: this.seRecibieronComentarios,
      seRetroalimento: this.seRetroalimento,
      seObtuvoCCompromiso: this.seObtuvoCCompromiso,
      accionRequerida:
        [this.accionPetsSeleccionada, this.requiereEntrenamiento ? 'Entrenamiento' : null]
          .filter((a): a is string => !!a)
          .join(',') || undefined,
      accionObservacion: this.accionObservacion || undefined,
      requierePetModificacion: this.requierePetModificacionComputado,
      requierePetModificacionNota: this.accionObservacion || undefined,
      trabajadores: trabajadoresReq,
      verificaciones: verificacionesReq,
      pasos: pasosReq,
      fotosAreaBase64: this.fotosAreaBase64,
      finalizar,
    };
  }

  // Guarda (crea o actualiza) como borrador, sin exigir mínimos — se puede llamar
  // con lo poco que haya en el paso 1 nada más.
  private guardarBorrador(onDone: () => void): void {
    this.guardandoBorrador = true;
    const request = this.construirRequest(false);
    const obs = this.optId
      ? this.optService.actualizarOpt(this.optId, request)
      : this.optService.crearOpt(request);

    obs.subscribe({
      next: (res) => {
        this.guardandoBorrador = false;
        if (!this.optId) {
          this.optId = res.id;
          // Deja la URL en modo "continuar" sin recargar el wizard — así un refresh
          // de la página no empieza una OPT nueva de cero.
          this.router.navigate(['/ssoma/gestion/opt/nuevo', this.optId], { replaceUrl: true });
        }
        // Las fotos/firmas recién subidas ya quedaron persistidas — se limpian de la
        // cola de "pendientes" para no reenviarlas en el próximo guardado (solo se
        // cuentan para el mínimo, no se pueden mostrar como miniatura hasta recargar).
        this.fotosNuevasYaGuardadas += this.fotosAreaBase64.length;
        this.fotosAreaBase64 = [];
        this.fotosAreaPreview = [];
        onDone();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBorrador = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── FINALIZAR ─────────────────────────────────────────────────────────────
  guardar(): void {
    if (this.guardando) return;
    if (this.trabajadores.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Agrega al menos un trabajador', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (this.totalFotos < 3) {
      Swal.fire({ icon: 'warning', title: 'Mínimo 3 fotos de la actividad', text: 'Agrega al menos 3 fotos de la actividad observada para finalizar.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      return;
    }

    this.guardando = true;
    this.loaderService.show();
    const request = this.construirRequest(true);
    const obs = this.optId
      ? this.optService.actualizarOpt(this.optId, request)
      : this.optService.crearOpt(request);

    obs.subscribe({
      next: (res) => {
        this.guardando = false;
        this.loaderService.hide();
        const id = this.optId ?? res.id;
        Swal.fire({
          icon: 'success',
          title: 'OPT finalizada',
          text: id ? `OPT #${id} registrada correctamente.` : 'Registrada correctamente.',
          confirmButtonText: 'Ver detalle',
          showCancelButton: true,
          cancelButtonText: 'Nueva OPT',
        }).then((r) => {
          if (r.isConfirmed && id) {
            this.router.navigate(['/ssoma/gestion/opt', id]);
          } else {
            this.router.navigate(['/ssoma/gestion/opt/nuevo']);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/opt/lista']);
  }
}
