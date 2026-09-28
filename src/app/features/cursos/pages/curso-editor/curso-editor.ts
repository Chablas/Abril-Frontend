import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CursoService } from '../../services/curso.service';
import {
  CursoDto,
  CursoSlideDto,
  CursoUpsertDto,
  CursoSlideUpsertDto,
  ContenidoLibreConfig,
  ElementoLibre,
  SlideEstilo,
  CursoPreguntaBancoDto,
} from '../../dtos/curso.dtos';
import { resolverEtiquetaSlide } from '../curso-player/slide-tipo-registro';
import { CanvasEditor } from './canvas-editor/canvas-editor';
import { SlideContenidoLibre } from '../curso-player/slides/slide-contenido-libre/slide-contenido-libre';
import { ColorHexInput } from '../../shared/color-hex-input/color-hex-input';
import { AudioPickerModal, AudioPickerResultado } from '../../shared/audio-picker-modal/audio-picker-modal';
import {
  VersionGuardada,
  agregarVersion,
  borrarBorrador,
  claveBorrador,
  claveHistorial,
  guardarBorrador,
  leerBorrador,
  listarVersiones,
} from './historial-local';
import { PLANTILLAS_LIBRE, PlantillaLibre } from './plantillas-libre';
import { PLANTILLAS_CURSO, PlantillaCurso } from './plantillas-curso';
import { construirConfiguracionPlanaDesdePregunta } from '../../pregunta-config-builder';
import { CANVAS_ANCHO, CANVAS_ALTO } from '../curso-player/slides/slide-contenido-libre/slide-contenido-libre';
import { SlideVerdaderoFalso } from '../curso-player/slides/slide-verdadero-falso/slide-verdadero-falso';
import { SlideOpcionMultiple } from '../curso-player/slides/slide-opcion-multiple/slide-opcion-multiple';
import { SlideOrdenar } from '../curso-player/slides/slide-ordenar/slide-ordenar';
import { SlideRespuestaCorta } from '../curso-player/slides/slide-respuesta-corta/slide-respuesta-corta';
import { SlideCompletarHuecos } from '../curso-player/slides/slide-completar-huecos/slide-completar-huecos';
import { SlideEmparejarConceptos } from '../curso-player/slides/slide-emparejar-conceptos/slide-emparejar-conceptos';
import { SlideEleccionMultiple } from '../curso-player/slides/slide-eleccion-multiple/slide-eleccion-multiple';
import { SlideDeslizaAcierta } from '../curso-player/slides/slide-desliza-acierta/slide-desliza-acierta';

const INTERVALO_AUTOGUARDADO_MS = 5000;

let idCorrelativo = 1;
function nuevoId(): string {
  return `n${Date.now()}_${idCorrelativo++}`;
}

/** Convierte los campos de un tipo de slide fijo (heredado, previo al lienzo libre) a
 *  elementos posicionados dentro del canvas 1280x720. Reubica lo que ya existe en
 *  posiciones razonables; el autor reacomoda desde ahí. Los tipos "pregunta_*" pierden su
 *  calificación automática (el lienzo libre no tiene forma de evaluar respuestas todavía). */
function convertirCamposAElementos(tipoCodigo: string, campos: any): ElementoLibre[] {
  const elementos: ElementoLibre[] = [];
  let z = 0;
  const agregarTexto = (texto: string, y: number, alto: number, tamanoFuente = 28) => {
    if (!texto) return;
    elementos.push({
      id: nuevoId(),
      tipo: 'texto',
      x: 80,
      y,
      ancho: 1120,
      alto,
      zIndex: z++,
      animacionEntrada: 'fade',
      texto,
      colorTexto: '#14100b',
      tamanoFuente,
      alineacion: 'left',
      negrita: tamanoFuente > 28,
    });
  };
  const agregarImagen = (imagenUrl: string, x: number, y: number, ancho: number, alto: number) => {
    if (!imagenUrl) return;
    elementos.push({
      id: nuevoId(),
      tipo: 'imagen',
      x,
      y,
      ancho,
      alto,
      zIndex: z++,
      animacionEntrada: 'fade',
      imagenUrl,
      bordeRedondeado: 10,
    });
  };

  switch (tipoCodigo) {
    case 'contenido_texto':
      agregarTexto(campos.titulo, 60, 70, 40);
      agregarTexto(campos.texto, 150, 200, 24);
      agregarImagen(campos.imagenUrl, 340, 380, 600, 300);
      break;
    case 'contenido_tarjetas': {
      agregarTexto(campos.titulo, 40, 60, 36);
      const tarjetas: any[] = campos.tarjetas || [];
      const colAncho = Math.floor(1120 / Math.max(1, Math.min(tarjetas.length, 3)));
      tarjetas.forEach((t, i) => {
        const col = i % 3;
        const fila = Math.floor(i / 3);
        const x = 80 + col * colAncho;
        const yBase = 140 + fila * 260;
        agregarImagen(t.imagenUrl, x, yBase, colAncho - 20, 140);
        agregarTexto(t.titulo, yBase + 150, 40, 22);
        agregarTexto(t.texto, yBase + 190, 60, 18);
      });
      break;
    }
    case 'contenido_galeria_zoom': {
      agregarTexto(campos.titulo, 40, 60, 36);
      const imagenes: any[] = campos.imagenes || [];
      const colAncho = Math.floor(1120 / Math.max(1, Math.min(imagenes.length, 4)));
      imagenes.forEach((img, i) => {
        const col = i % 4;
        const fila = Math.floor(i / 4);
        agregarImagen(img.imagenUrl, 80 + col * colAncho, 140 + fila * 220, colAncho - 20, 180);
      });
      break;
    }
    case 'pregunta_vf':
      agregarTexto(campos.enunciado, 60, 120, 30);
      agregarImagen(campos.imagenUrl, 340, 260, 600, 300);
      break;
    case 'pregunta_opcion_multiple': {
      agregarTexto(campos.enunciado, 60, 100, 30);
      const opciones: any[] = campos.opciones || [];
      opciones.forEach((o, i) => agregarTexto(o.texto, 200 + i * 70, 50, 22));
      break;
    }
    case 'pregunta_ordenar': {
      agregarTexto(campos.enunciado, 60, 100, 30);
      const items: any[] = campos.items || [];
      items.forEach((it, i) => agregarTexto(`${i + 1}. ${it.texto}`, 200 + i * 70, 50, 22));
      break;
    }
    case 'pregunta_imagen': {
      agregarTexto(campos.enunciado, 40, 80, 30);
      const imagenesPregunta: any[] = campos.imagenes || [];
      const colAncho = Math.floor(1120 / Math.max(1, Math.min(imagenesPregunta.length, 4)));
      imagenesPregunta.forEach((img, i) => {
        const col = i % 4;
        const fila = Math.floor(i / 4);
        agregarImagen(img.imagenUrl, 80 + col * colAncho, 160 + fila * 220, colAncho - 20, 180);
        agregarTexto(img.texto, 160 + fila * 220 + 185, 30, 16);
      });
      break;
    }
    case 'pregunta_arrastrar': {
      agregarTexto(campos.enunciado, 40, 80, 30);
      const items: any[] = campos.items || [];
      const zonas: any[] = campos.zonas || [];
      items.forEach((it, i) => agregarTexto(it.texto, 160 + i * 70, 200, 22));
      zonas.forEach((z2, i) => agregarTexto(z2.texto, 160 + i * 70, 700, 22));
      break;
    }
  }
  return elementos;
}

@Component({
  selector: 'app-curso-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CanvasEditor,
    ColorHexInput,
    SlideVerdaderoFalso,
    SlideOpcionMultiple,
    SlideOrdenar,
    SlideRespuestaCorta,
    SlideCompletarHuecos,
    SlideEmparejarConceptos,
    SlideEleccionMultiple,
    SlideDeslizaAcierta,
    AudioPickerModal,
    SlideContenidoLibre,
  ],
  templateUrl: './curso-editor.html',
  styleUrl: './curso-editor.css',
})
export class CursoEditor implements OnInit, OnDestroy {
  cursoId: number | null = null;
  curso: CursoUpsertDto = {
    titulo: '',
    descripcion: '',
    categoriaNombre: '',
    rolDestino: '',
    notaMinimaAprobacion: 14,
    activo: true,
    colorTema: '#0f6e56',
    logoUrl: null,
  };

  slides: CursoSlideDto[] = [];
  cargando = false;

  // Solo se usa cuando no hay :id en la ruta (pantalla "Administrar cursos").
  todosLosCursos: CursoDto[] = [];
  mostrarFormularioNuevo = false;

  // Slide en edición: siempre lienzo libre (elementos posicionables). Cualquier tipo
  // heredado se convierte automáticamente al abrirla — ver `convertirCamposAElementos`.
  slideEditando: {
    id: number | null;
    orden: number;
    campos: { titulo: string; kicker?: string; elementos: ElementoLibre[]; estilo?: SlideEstilo };
  } | null = null;

  mostrarSelectorFondo = false;
  paginasRailColapsado = true;

  toggleRailPaginas(): void {
    this.paginasRailColapsado = !this.paginasRailColapsado;
  }

  mostrarSelectorPlantilla = false;
  plantillasDisponibles = PLANTILLAS_LIBRE;

  // ---- Banco de preguntas reutilizable entre cursos ----
  // Tipos evaluables reales (con corrección automática): a diferencia de "contenido_libre",
  // NUNCA se abren en el lienzo (guardarSlide() convertiría el tipo y perderían la
  // evaluación) — se insertan o se guardan al banco directo desde su fila en la grilla.
  readonly TIPOS_EVALUABLES = [
    'pregunta_vf',
    'pregunta_opcion_multiple',
    'pregunta_ordenar',
    'pregunta_respuesta_corta',
    'pregunta_completar_huecos',
    'pregunta_emparejar',
    'pregunta_eleccion_multiple',
    'pregunta_desliza_acierta',
  ];
  pestanaSelectorPlantilla: 'plantillas' | 'banco' = 'plantillas';
  bancoPreguntas: CursoPreguntaBancoDto[] = [];
  filtroTipoBanco = '';

  // ---- Editor de preguntas evaluables (formulario propio, nunca pasa por el lienzo) ----
  mostrarPreguntaEditor = false;
  preguntaEditando: {
    id: number | null;
    orden: number;
    tipoCodigo: string;
    puntaje: number;
    /** false = solo práctica (esEvaluable/modoCorreccion se guardan como no calificado,
     *  pero el reproductor sigue mostrando si acertó o no — ver curso-player.onRespuesta). */
    contarParaNota: boolean;
    kicker: string;
    enunciado: string;
    imagenUrl: string;
    opciones: { id: string; texto: string; imagenUrl: string; correcta: boolean }[];
    items: { id: string; texto: string }[];
    respuestaTexto: string;
    variantes: string;
    textoHuecos: string;
    respuestasHuecos: string[];
    izquierda: { id: string; texto: string }[];
    derecha: { id: string; texto: string }[];
    parejas: Record<string, string>;
    deslizaTarjetas: { id: string; texto: string; imagenUrl?: string; correcta: boolean }[];
    deslizaUmbralAprobarPct?: number;
  } | null = null;
  mostrarConfiguracionCurso = false;
  readonly canvasAncho = CANVAS_ANCHO;
  readonly canvasAlto = CANVAS_ALTO;
  /** Vista previa de cada plantilla, generada una sola vez para dibujarla a escala en el
   *  selector — nunca es lo que se guarda (elegirPlantilla vuelve a llamar generar()). */
  private previasPlantillas = new Map<string, ElementoLibre[]>(
    PLANTILLAS_LIBRE.map((p) => [p.id, p.generar()]),
  );

  elementosPreviaPlantilla(plantilla: PlantillaLibre): ElementoLibre[] {
    return this.previasPlantillas.get(plantilla.id) ?? [];
  }

  /** Igual que elementosPreviaPlantilla, pero para una pantalla real ya guardada — mismo
   *  renderizado en miniatura (bloques de color, sin texto/imagen real) tanto en la grilla
   *  de "Pantallas del curso" como en el riel lateral "Páginas". Solo lienzo libre trae
   *  elementos posicionables; los tipos heredados muestran el ícono genérico de siempre. */
  elementosPreviaSlide(slide: CursoSlideDto): ElementoLibre[] {
    if (slide.tipoCodigo !== 'contenido_libre') return [];
    try {
      const campos = JSON.parse(slide.configuracionJson || '{}');
      return campos.elementos || [];
    } catch {
      return [];
    }
  }

  private primerCargaSlides = true;

  // ---- Autoguardado + historial de versiones (ver ../historial-local.ts) ----
  ultimoAutoguardadoEn: number | null = null;
  mostrarHistorial = false;
  versionesDisponibles: VersionGuardada[] = [];
  private claveBorradorActual: string | null = null;
  private ultimoSnapshotAutoguardado = '';
  private intervaloAutoguardado: ReturnType<typeof setInterval> | null = null;

  @ViewChild('fiPreview') private fiPreview?: ElementRef<HTMLInputElement>;
  @ViewChild('fiLogo') private fiLogo?: ElementRef<HTMLInputElement>;
  @ViewChild('fiFondo') private fiFondo?: ElementRef<HTMLInputElement>;
  @ViewChild('ce') private canvasEditorRef?: CanvasEditor;
  private objetivoSubidaPreview: any = null;
  campoSubidaPreview = 'imagenUrl';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cursoId = Number(idParam);
      this.cargarCurso();
    } else {
      this.cargarTodosLosCursos();
    }
  }

  ngOnDestroy(): void {
    this.detenerAutoguardado();
  }

  private cargarTodosLosCursos(): void {
    this.cargando = true;
    // App zoneless: forzamos el refresco tras el subscribe o la lista no se pinta.
    this.cursoService.getCursosAdmin().subscribe({
      next: (cursos) => {
        this.todosLosCursos = cursos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  irAEditar(curso: CursoDto): void {
    this.router.navigate(['/cursos/editor', curso.id]);
  }

  mostrarNuevoCurso(): void {
    this.mostrarFormularioNuevo = true;
    this.filtroGaleria = '';
  }

  // ---- Plantillas de curso completo (portada + contenido + quiz de una vez), estilo
  // Genially "Empezar desde una plantilla" — ver plantillas-curso.ts. ----

  readonly plantillasCurso = PLANTILLAS_CURSO;
  /** Cursos marcados `esPlantilla` — se crean con "Guardar como plantilla" (ver
   *  guardarComoPlantilla() más abajo) y aparecen aquí para reusarlos desde la galería. */
  get plantillasGuardadas(): CursoDto[] {
    return this.todosLosCursos.filter((c) => c.esPlantilla);
  }

  // ---- Buscador de la galería "Elige cómo crear" ----
  filtroGaleria = '';

  private coincide(...campos: (string | null | undefined)[]): boolean {
    const q = this.filtroGaleria.trim().toLowerCase();
    if (!q) return true;
    return campos.some((c) => (c ?? '').toLowerCase().includes(q));
  }

  get plantillasGuardadasFiltradas(): CursoDto[] {
    return this.plantillasGuardadas.filter((pl) => this.coincide(pl.titulo, pl.categoriaNombre));
  }

  get plantillasCursoFiltradas(): PlantillaCurso[] {
    return this.plantillasCurso.filter((pl) => this.coincide(pl.nombre, pl.descripcion, pl.categoriaSugerida));
  }

  // ---- Vista previa de una plantilla antes de crear el curso (galería) ----
  previewSlides: CursoSlideDto[] | null = null;
  previewIndice = 0;
  previewTitulo = '';
  /** true cuando la preview es de una "Plantilla rápida" (código fijo, no editable) —
   *  controla si se muestra el botón "Convertir en plantilla editable". */
  previewEsRapida = false;
  private previewAccion: (() => void) | null = null;
  private previewPlantillaRapida: PlantillaCurso | null = null;

  previsualizarPlantillaRapida(pl: PlantillaCurso): void {
    const slides = pl.generarSlides().map((s, i) => ({ ...s, id: 0, cursoId: 0, orden: i + 1 }));
    this.previewSlides = slides;
    this.previewIndice = 0;
    this.previewTitulo = pl.nombre;
    this.previewEsRapida = true;
    this.previewPlantillaRapida = pl;
    this.previewAccion = () => this.crearCursoDesdePlantilla(pl);
  }

  previsualizarPlantillaGuardada(pl: CursoDto): void {
    this.cursoService.getSlidesAdmin(pl.id).subscribe({
      next: (slides) => {
        this.previewSlides = slides;
        this.previewIndice = 0;
        this.previewTitulo = pl.titulo;
        this.previewEsRapida = false;
        this.previewPlantillaRapida = null;
        this.previewAccion = () => this.usarPlantillaGuardada(pl);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo cargar la plantilla', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  cerrarPreviewPlantilla(): void {
    this.previewSlides = null;
    this.previewAccion = null;
    this.previewPlantillaRapida = null;
  }

  /** Cualquier botón "ir a página" dentro de la vista previa avanza simplemente a la
   *  siguiente pantalla del recorrido — el ID real de destino no existe todavía porque
   *  estas pantallas no están guardadas en la base de datos. */
  avanzarPreviewPorClic(): void {
    if (!this.previewSlides) return;
    if (this.previewIndice < this.previewSlides.length - 1) this.previewIndice++;
  }

  /** Barra lateral fija de navegación, estilo Genially (home / ↑ / ↓): a diferencia del
   *  paginador chico de abajo (que sigue ahí para saltar con el número de página a la
   *  vista), esta vive SIEMPRE visible encima del lienzo — así una pantalla sin ningún
   *  botón propio (como "¿Qué es el EPP?") igual deja claro cómo seguir, sin que el
   *  autor tenga que buscar controles pegados al borde. */
  previewIrAInicio(): void {
    this.previewIndice = 0;
  }

  previewIrAnterior(): void {
    if (this.previewIndice > 0) this.previewIndice--;
  }

  previewIrSiguiente(): void {
    if (!this.previewSlides) return;
    if (this.previewIndice < this.previewSlides.length - 1) this.previewIndice++;
  }

  /** Convierte una "Plantilla rápida" (código fijo) en un curso real marcado `esPlantilla`
   *  — a partir de ahora aparece en "Tus plantillas" y es 100% editable desde la UI, igual
   *  que cualquier curso. No navega a ningún lado: se queda en la galería. */
  async convertirPlantillaRapidaEnEditable(): Promise<void> {
    const pl = this.previewPlantillaRapida;
    if (!pl) return;

    const { value: titulo } = await Swal.fire({
      title: 'Nombre de la plantilla',
      input: 'text',
      inputValue: pl.nombre,
      inputPlaceholder: 'Nombre de la plantilla',
      showCancelButton: true,
      confirmButtonText: 'Convertir en editable',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un nombre' : undefined),
    });
    if (!titulo) return;

    const payload: CursoUpsertDto = {
      titulo,
      descripcion: '',
      categoriaNombre: pl.categoriaSugerida,
      rolDestino: '',
      notaMinimaAprobacion: 14,
      activo: true,
      colorTema: '#f5a623',
      logoUrl: null,
      esPlantilla: true,
    };
    this.cursoService.crearCurso(payload).subscribe({
      next: (nuevo) => {
        this.crearSlidesSecuencial(nuevo.id, pl.generarSlides(), 0, (creadas) => {
          this.wireNavegacionSecuencial(creadas);
          this.cargarTodosLosCursos();
          this.cerrarPreviewPlantilla();
          Swal.fire({ icon: 'success', title: 'Ya es una plantilla editable', text: 'Búscala en "Tus plantillas" o en Administrar cursos.', timer: 2200, showConfirmButton: false });
          this.cdr.detectChanges();
        });
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo convertir la plantilla', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  confirmarUsarPreview(): void {
    const accion = this.previewAccion;
    this.cerrarPreviewPlantilla();
    accion?.();
  }

  private crearSlidesSecuencial(
    cursoId: number,
    slides: Omit<CursoSlideUpsertDto, 'orden'>[],
    indice: number,
    alTerminar: (creadas: CursoSlideDto[]) => void,
    creadas: CursoSlideDto[] = [],
  ): void {
    if (indice >= slides.length) {
      alTerminar(creadas);
      return;
    }
    const dto: CursoSlideUpsertDto = { ...slides[indice], orden: indice + 1 };
    this.cursoService.crearSlide(cursoId, dto).subscribe({
      next: (creada) => this.crearSlidesSecuencial(cursoId, slides, indice + 1, alTerminar, [...creadas, creada]),
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: `No se pudo crear la pantalla ${indice + 1} de la plantilla`, text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Reemplaza el ID provisorio (-1) de los botones "ir a página" que arman las plantillas
   *  de plantillas-curso.ts por el ID real de la SIGUIENTE pantalla ya creada — recién acá
   *  existen los IDs reales, así que este cableado solo puede hacerse después de crear
   *  todas las pantallas. Sin esto, "Comenzar" (y cualquier botón similar) no llevaría a
   *  ningún lado en un curso real, igual que en la vista previa antes de crear el curso. */
  private wireNavegacionSecuencial(creadas: CursoSlideDto[]): void {
    creadas.forEach((slide, i) => {
      const siguiente = creadas[i + 1];
      if (!siguiente || slide.tipoCodigo !== 'contenido_libre') return;

      let config: ContenidoLibreConfig;
      try {
        config = JSON.parse(slide.configuracionJson || '{}');
      } catch {
        return;
      }
      if (!config.elementos?.length) return;

      let cambio = false;
      for (const el of config.elementos) {
        if (el.tipo === 'boton' && el.botonAccion === 'pagina' && el.botonSlideId === -1) {
          el.botonSlideId = siguiente.id;
          cambio = true;
        }
      }
      if (!cambio) return;

      this.cursoService
        .actualizarSlide(slide.id, {
          orden: slide.orden,
          tipoCodigo: slide.tipoCodigo,
          esEvaluable: slide.esEvaluable,
          puntaje: slide.puntaje,
          contarParaNota: slide.contarParaNota,
          modoCorreccion: slide.modoCorreccion,
          configuracionJson: JSON.stringify(config),
        })
        .subscribe({ error: () => {} });
    });
  }

  async crearCursoDesdePlantilla(pl: PlantillaCurso): Promise<void> {
    const { value: titulo } = await Swal.fire({
      title: 'Nombre del curso',
      input: 'text',
      inputValue: pl.tituloSugerido,
      inputPlaceholder: 'Título del curso',
      showCancelButton: true,
      confirmButtonText: 'Crear curso',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un título' : undefined),
    });
    if (!titulo) return;

    const payload = { ...this.curso, titulo, categoriaNombre: pl.categoriaSugerida };
    this.cursoService.crearCurso(payload).subscribe({
      next: (nuevo) => {
        const slides = pl.generarSlides();
        this.crearSlidesSecuencial(nuevo.id, slides, 0, (creadas) => {
          this.wireNavegacionSecuencial(creadas);
          this.router.navigate(['/cursos/editor', nuevo.id]);
          Swal.fire({ icon: 'success', title: 'Curso creado desde la plantilla', timer: 1400, showConfirmButton: false });
          this.cdr.detectChanges();
        });
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo crear el curso', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Clona TODAS las pantallas de `origenCursoId` dentro de `destinoCursoId`, en el mismo
   *  orden — usado tanto por "Usar esta plantilla" como por "Guardar como plantilla"
   *  (el curso ya se crea aparte; esto solo copia el contenido). */
  private clonarSlides(origenCursoId: number, destinoCursoId: number, alTerminar: (creadas: CursoSlideDto[]) => void): void {
    this.cursoService.getSlidesAdmin(origenCursoId).subscribe({
      next: (slides) => {
        const paraCrear: Omit<CursoSlideUpsertDto, 'orden'>[] = [...slides]
          .sort((a, b) => a.orden - b.orden)
          .map((s) => ({
            tipoCodigo: s.tipoCodigo,
            esEvaluable: s.esEvaluable,
            puntaje: s.puntaje,
            contarParaNota: s.contarParaNota,
            modoCorreccion: s.modoCorreccion,
            configuracionJson: s.configuracionJson,
          }));
        this.crearSlidesSecuencial(destinoCursoId, paraCrear, 0, alTerminar);
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudieron copiar las pantallas', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Crea un curso NUEVO (no plantilla) clonando título/color/categoría y todas las
   *  pantallas de una plantilla guardada (`c.esPlantilla`), y navega a su editor. */
  async usarPlantillaGuardada(pl: CursoDto): Promise<void> {
    const { value: titulo } = await Swal.fire({
      title: 'Nombre del curso',
      input: 'text',
      inputValue: pl.titulo,
      inputPlaceholder: 'Título del curso',
      showCancelButton: true,
      confirmButtonText: 'Crear curso',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un título' : undefined),
    });
    if (!titulo) return;

    const payload: CursoUpsertDto = {
      titulo,
      descripcion: pl.descripcion ?? '',
      categoriaNombre: pl.categoriaNombre ?? '',
      rolDestino: pl.rolDestino ?? '',
      notaMinimaAprobacion: pl.notaMinimaAprobacion,
      activo: true,
      colorTema: pl.colorTema ?? '#0f6e56',
      logoUrl: pl.logoUrl ?? null,
      esPlantilla: false,
    };
    this.cursoService.crearCurso(payload).subscribe({
      next: (nuevo) => {
        this.clonarSlides(pl.id, nuevo.id, () => {
          this.router.navigate(['/cursos/editor', nuevo.id]);
          Swal.fire({ icon: 'success', title: 'Curso creado desde la plantilla', timer: 1400, showConfirmButton: false });
          this.cdr.detectChanges();
        });
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo crear el curso', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Clona el curso actual (con todas sus pantallas) en un curso nuevo marcado
   *  `esPlantilla: true` — no toca el curso original. El clon aparece en "Tus plantillas"
   *  dentro de la galería "Elige cómo crear tu curso", editable y reutilizable como
   *  cualquier otro curso. */
  async guardarComoPlantilla(): Promise<void> {
    if (!this.cursoId) return;
    const { value: titulo } = await Swal.fire({
      title: 'Guardar como plantilla',
      input: 'text',
      inputValue: `${this.curso.titulo} (plantilla)`,
      inputPlaceholder: 'Nombre de la plantilla',
      showCancelButton: true,
      confirmButtonText: 'Guardar plantilla',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un nombre' : undefined),
    });
    if (!titulo) return;

    const payload: CursoUpsertDto = {
      titulo,
      descripcion: this.curso.descripcion ?? '',
      categoriaNombre: this.curso.categoriaNombre ?? '',
      rolDestino: this.curso.rolDestino ?? '',
      notaMinimaAprobacion: this.curso.notaMinimaAprobacion,
      activo: true,
      colorTema: this.curso.colorTema ?? '#0f6e56',
      logoUrl: this.curso.logoUrl ?? null,
      esPlantilla: true,
    };
    this.cursoService.crearCurso(payload).subscribe({
      next: (nuevo) => {
        this.clonarSlides(this.cursoId!, nuevo.id, () => {
          this.cargarTodosLosCursos();
          Swal.fire({ icon: 'success', title: 'Plantilla guardada', timer: 1400, showConfirmButton: false });
          this.cdr.detectChanges();
        });
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo guardar la plantilla', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Elimina un curso por completo (curso + slides + intentos + evidencia SUNAFIL) — pide
   *  2 confirmaciones si nadie lo rindió todavía, o 3 si ya hay evaluaciones registradas
   *  (porque ahí se pierde evidencia legal, no solo contenido). Irreversible. */
  eliminarCurso(c: CursoDto, event: Event): void {
    event.stopPropagation();

    this.cursoService.getTieneEvaluaciones(c.id).subscribe({
      next: ({ tieneEvaluaciones }) => this.confirmarEliminarCurso(c, tieneEvaluaciones),
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo verificar el curso', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  private async confirmarEliminarCurso(c: CursoDto, tieneEvaluaciones: boolean): Promise<void> {
    const pasos = tieneEvaluaciones
      ? [
          {
            icon: 'warning' as const,
            title: `Este curso YA tiene evaluaciones rendidas`,
            html: `<b>${c.titulo}</b> tiene trabajadores que ya lo rindieron. Eliminarlo borra también sus intentos y la evidencia SUNAFIL asociada (IP, geolocalización, declaración jurada, hash). Esto no se puede deshacer.`,
          },
          { icon: 'warning' as const, title: '¿Confirmas que quieres continuar?', html: `Se perderá el historial de evaluaciones de <b>${c.titulo}</b>.` },
          { icon: 'error' as const, title: 'Última confirmación', html: `Escribe que sí para eliminar <b>${c.titulo}</b> definitivamente.` },
        ]
      : [
          { icon: 'warning' as const, title: `¿Eliminar "${c.titulo}"?`, html: 'Se borrará el curso y todas sus pantallas. Nadie lo ha rendido todavía.' },
          { icon: 'error' as const, title: 'Esta acción no se puede deshacer', html: `Confirma que quieres eliminar <b>${c.titulo}</b> definitivamente.` },
        ];

    for (const paso of pasos) {
      const r = await Swal.fire({ ...paso, showCancelButton: true, confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar' });
      if (!r.isConfirmed) return;
    }

    this.cursoService.eliminarCurso(c.id).subscribe({
      next: () => {
        this.cargarTodosLosCursos();
        Swal.fire({ icon: 'success', title: 'Curso eliminado', timer: 1400, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo eliminar el curso', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  resolverEtiqueta(tipoCodigo: string): string {
    return resolverEtiquetaSlide(tipoCodigo) ?? tipoCodigo;
  }

  /** Ícono representativo por tipo, para la miniatura visual de cada pantalla. */
  iconoParaTipo(tipoCodigo: string): string {
    const iconos: Record<string, string> = {
      contenido_texto: 'ti-align-left',
      contenido_tarjetas: 'ti-cards',
      contenido_galeria_zoom: 'ti-photo',
      contenido_libre: 'ti-layout-collage',
      pregunta_vf: 'ti-check',
      pregunta_opcion_multiple: 'ti-list-check',
      pregunta_imagen: 'ti-click',
      pregunta_arrastrar: 'ti-drag-drop',
      pregunta_ordenar: 'ti-arrows-sort',
      pregunta_respuesta_corta: 'ti-forms',
      pregunta_completar_huecos: 'ti-text-size',
      pregunta_emparejar: 'ti-arrows-right-left',
      pregunta_eleccion_multiple: 'ti-checkbox',
      pregunta_desliza_acierta: 'ti-swipe',
    };
    return iconos[tipoCodigo] ?? 'ti-file';
  }

  /** Extrae un texto representativo (título/kicker/enunciado) del JSON de la slide,
   *  solo para mostrar en la miniatura visual — no valida ni depende de su forma exacta. */
  tituloSlide(slide: CursoSlideDto): string {
    try {
      const campos = JSON.parse(slide.configuracionJson || '{}');
      return campos.titulo || campos.enunciado || campos.kicker || this.resolverEtiqueta(slide.tipoCodigo);
    } catch {
      return this.resolverEtiqueta(slide.tipoCodigo);
    }
  }

  /** Páginas del curso a las que un botón puede saltar (todas menos la que se está editando). */
  get paginasParaBoton(): { id: number; titulo: string }[] {
    if (!this.slideEditando) return [];
    return this.slides
      .filter((s) => s.id != null && s.id !== this.slideEditando!.id)
      .map((s) => ({ id: s.id as number, titulo: `${s.orden} · ${this.tituloSlide(s)}` }));
  }

  subirImagenElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'imagenUrl';
    this.fiPreview?.nativeElement.click();
  }

  /** Añade una imagen más al carrusel — sentinela '__carrusel_push__' que subirImagenA
   *  reconoce para hacer push al array en vez de reemplazar un campo escalar. */
  subirImagenCarruselElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = '__carrusel_push__';
    this.fiPreview?.nativeElement.click();
  }

  subirAudioMiniaturaElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'audioMiniaturaUrl';
    this.fiPreview?.nativeElement.click();
  }

  subirImagenHotspotElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'hotspotImagenUrl';
    this.fiPreview?.nativeElement.click();
  }

  /** Vista previa de la pantalla que se está editando: arma la slide a partir de los
   *  elementos EN VIVO del lienzo (this.ce.elementos), no de lo último guardado, para que
   *  se vea el efecto de cambios que el autor aún no guardó. Renderizada con el mismo
   *  componente que usa el reproductor real, así que las animaciones/temporizador se ven
   *  exactamente igual que las verá el trabajador. */
  mostrarVistaPrevia = false;
  previewDispositivo: 'escritorio' | 'movil' = 'escritorio';
  @ViewChild('ce') private ceRef?: CanvasEditor;

  get slideParaVistaPrevia(): CursoSlideDto | null {
    if (!this.mostrarVistaPrevia || !this.slideEditando || !this.ceRef) return null;
    return {
      id: this.slideEditando.id ?? 0,
      cursoId: this.cursoId ?? 0,
      orden: this.slideEditando.orden,
      tipoCodigo: 'contenido_libre',
      esEvaluable: false,
      configuracionJson: JSON.stringify({ elementos: this.ceRef.elementos }),
    };
  }

  /** El botón "ir a página" (o su flecha) dentro de la vista previa de una sola pantalla:
   *  -1 es el ID provisorio que dejan las plantillas (ver plantillas-curso.ts) y significa
   *  "la siguiente"; un ID real navega el editor a esa pantalla guardada, igual que las
   *  flechas prev/siguiente del lienzo. */
  previewIrAPagina(destinoId: number): void {
    this.mostrarVistaPrevia = false;
    if (destinoId === -1) {
      this.irAPagina(1);
      return;
    }
    const destino = this.slides.find((s) => s.id === destinoId);
    if (destino) this.irAPaginaDesde(destino);
  }

  mostrarModalAudio = false;

  subirAudioElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'audioUrl';
    this.mostrarModalAudio = true;
  }

  subirAudioPreguntaElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'preguntaAudioUrl';
    this.mostrarModalAudio = true;
  }

  /** Resultado del modal "Reproducir audio" (subir/grabar → sube el archivo real;
   *  enlace → se guarda tal cual, sin pasar por el storage propio). */
  onResultadoAudio(resultado: AudioPickerResultado): void {
    this.mostrarModalAudio = false;
    if (!this.objetivoSubidaPreview) return;

    if (resultado.tipo === 'enlace') {
      this.objetivoSubidaPreview[this.campoSubidaPreview] = resultado.url;
      this.objetivoSubidaPreview = null;
      this.cdr.detectChanges();
      return;
    }

    const objetivo = this.objetivoSubidaPreview;
    const campo = this.campoSubidaPreview;
    this.objetivoSubidaPreview = null;
    this.cursoService.subirImagen(resultado.archivo).subscribe({
      next: (res) => {
        objetivo[campo] = res.url;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo subir el audio', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  onArchivoPreviewSeleccionado(event: Event): void {
    if (this.objetivoSubidaPreview) {
      this.subirImagenA(this.objetivoSubidaPreview, this.campoSubidaPreview, event);
    }
    this.objetivoSubidaPreview = null;
  }

  private cargarCurso(): void {
    if (!this.cursoId) return;
    this.cargando = true;
    // App zoneless: forzamos el refresco tras el subscribe o el formulario no se pinta.
    this.cursoService.getCursosAdmin().subscribe({
      next: (cursos) => {
        const encontrado = cursos.find((c) => c.id === this.cursoId);
        if (encontrado) {
          this.curso = {
            titulo: encontrado.titulo,
            descripcion: encontrado.descripcion ?? '',
            categoriaNombre: encontrado.categoriaNombre ?? '',
            rolDestino: encontrado.rolDestino ?? '',
            notaMinimaAprobacion: encontrado.notaMinimaAprobacion,
            activo: encontrado.activo,
            colorTema: encontrado.colorTema ?? '#0f6e56',
            logoUrl: encontrado.logoUrl ?? null,
            // PENDIENTE DE BACKEND (ver nota en curso.dtos.ts): `encontrado` nunca va a
            // traer estos 3 campos hasta que Abril_Backend los devuelva — quedan
            // undefined al recargar la página, aunque se hayan editado antes.
            colorMarcaSecundario: encontrado.colorMarcaSecundario ?? null,
            colorMarcaTerciario: encontrado.colorMarcaTerciario ?? null,
            colorTextoMarca: encontrado.colorTextoMarca ?? null,
            estilosTextoMarcaJson: encontrado.estilosTextoMarcaJson ?? null,
          };
        }
        this.cargarSlides();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarSlides(alTerminar?: () => void): void {
    if (!this.cursoId) return;
    // App zoneless: forzamos el refresco tras el subscribe o la grilla de pantallas no se pinta.
    this.cursoService.getSlidesAdmin(this.cursoId).subscribe({
      next: (slides) => {
        this.slides = [...slides].sort((a, b) => a.orden - b.orden);
        this.cargando = false;
        // Estilo Genially: entrar a un curso abre directo la primera pantalla en el
        // lienzo, sin pasar por la grilla de miniaturas — solo la primera vez que carga.
        if (this.primerCargaSlides) {
          this.primerCargaSlides = false;
          if (this.slides.length && !this.slideEditando) this.editarSlide(this.slides[0]);
        }
        this.cdr.detectChanges();
        alTerminar?.();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  abrirConfiguracionCurso(): void {
    this.mostrarConfiguracionCurso = true;
  }

  cerrarConfiguracionCurso(): void {
    this.mostrarConfiguracionCurso = false;
  }

  guardarCurso(): void {
    if (!this.curso.titulo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta el título del curso' });
      return;
    }

    if (this.cursoId) {
      this.cursoService.actualizarCurso(this.cursoId, this.curso).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Curso actualizado', timer: 1200, showConfirmButton: false });
          this.mostrarConfiguracionCurso = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err.error?.message });
          this.cdr.detectChanges();
        },
      });
    } else {
      this.cursoService.crearCurso(this.curso).subscribe({
        next: (nuevo) => {
          this.cursoId = nuevo.id;
          this.router.navigate(['/cursos/editor', nuevo.id]);
          Swal.fire({ icon: 'success', title: 'Curso creado', timer: 1200, showConfirmButton: false });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire({ icon: 'error', title: 'No se pudo crear el curso', text: err.error?.message });
          this.cdr.detectChanges();
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Slides — siempre lienzo libre; abrir una slide heredada la convierte al vuelo.
  // ---------------------------------------------------------------------

  abrirSelectorPlantilla(): void {
    this.mostrarSelectorPlantilla = true;
    this.pestanaSelectorPlantilla = 'plantillas';
  }

  cerrarSelectorPlantilla(): void {
    this.mostrarSelectorPlantilla = false;
  }

  elegirPlantilla(plantilla: PlantillaLibre): void {
    this.mostrarSelectorPlantilla = false;
    this.slideEditando = {
      id: null,
      orden: this.slides.length + 1,
      campos: { titulo: '', kicker: '', elementos: plantilla.generar() },
    };
    this.iniciarAutoguardadoParaSlideActual();
    this.cdr.detectChanges();
  }

  /** Atajo desde el riel del lienzo (botón "Preguntas", estilo Genially): abre el mismo
   *  selector de "Añadir página" pero directo en la pestaña del banco. */
  abrirSelectorPlantillaEnBanco(): void {
    this.mostrarSelectorPlantilla = true;
    this.abrirPestanaBanco();
  }

  /** Abre una pregunta evaluable YA GUARDADA en su formulario propio — reconstruye los
   *  campos editables a partir del configuracionJson real, tal como está en la base. */
  abrirPreguntaEditor(slide: CursoSlideDto): void {
    let c: any = {};
    try {
      c = JSON.parse(slide.configuracionJson || '{}');
    } catch {
      c = {};
    }
    const rc = c.respuestaCorrecta ?? {};

    this.preguntaEditando = {
      id: slide.id,
      orden: slide.orden,
      tipoCodigo: slide.tipoCodigo,
      puntaje: slide.puntaje ?? 10,
      contarParaNota: slide.contarParaNota ?? true,
      kicker: c.kicker || '',
      enunciado: c.enunciado || '',
      imagenUrl: c.imagenUrl || '',
      opciones: (c.opciones || []).map((o: any) => ({
        id: o.id,
        texto: o.texto || '',
        imagenUrl: o.imagenUrl || '',
        correcta:
          slide.tipoCodigo === 'pregunta_eleccion_multiple'
            ? (rc.opcionIds || []).includes(o.id)
            : o.id === rc.opcionId,
      })),
      items: c.items || [],
      respuestaTexto: rc.texto || '',
      variantes: (c.variantesAceptadas || []).join(', '),
      textoHuecos: c.texto || '',
      respuestasHuecos: rc.textos || [],
      izquierda: c.izquierda || [],
      derecha: c.derecha || [],
      parejas: rc || {},
      deslizaTarjetas: (c.tarjetas || []).map((t: any, i: number) => ({
        id: t.id,
        texto: t.texto || '',
        imagenUrl: t.imagenUrl || '',
        correcta: !!rc.valores?.[i],
      })),
      deslizaUmbralAprobarPct: c.umbralAprobarPct ?? 100,
    };

    if (slide.tipoCodigo === 'pregunta_vf') {
      this.preguntaEditando!.opciones = [
        { id: 'true', texto: 'Verdadero', imagenUrl: '', correcta: rc.valor === true },
        { id: 'false', texto: 'Falso', imagenUrl: '', correcta: rc.valor === false },
      ];
    }

    if (slide.tipoCodigo === 'pregunta_desliza_acierta' && !this.preguntaEditando!.deslizaTarjetas.length) {
      this.preguntaEditando!.deslizaTarjetas = [
        { id: nuevoId(), texto: '', imagenUrl: '', correcta: true },
        { id: nuevoId(), texto: '', imagenUrl: '', correcta: false },
      ];
    }

    this.mostrarPreguntaEditor = true;
  }

  cerrarPreguntaEditor(): void {
    this.mostrarPreguntaEditor = false;
    this.preguntaEditando = null;
  }

  // ---- CRUD de listas dentro del formulario de pregunta ----

  agregarOpcion(): void {
    if (!this.preguntaEditando) return;
    const letra = String.fromCharCode(97 + this.preguntaEditando.opciones.length);
    this.preguntaEditando.opciones.push({ id: letra, texto: '', imagenUrl: '', correcta: false });
  }

  quitarOpcion(i: number): void {
    this.preguntaEditando?.opciones.splice(i, 1);
  }

  marcarOpcionCorrecta(i: number): void {
    if (!this.preguntaEditando) return;
    this.preguntaEditando.opciones.forEach((o, idx) => (o.correcta = idx === i));
  }

  /** A diferencia de marcarOpcionCorrecta (exclusiva, una sola), esta es para "Elección
   *  múltiple": cada opción se marca/desmarca de forma independiente. */
  toggleOpcionCorrecta(i: number): void {
    const o = this.preguntaEditando?.opciones[i];
    if (o) o.correcta = !o.correcta;
  }

  // ---- Tarjetas de "Desliza y acierta" (mazo, estilo Genially) ----

  agregarTarjetaDesliza(): void {
    this.preguntaEditando?.deslizaTarjetas.push({ id: nuevoId(), texto: '', imagenUrl: '', correcta: true });
  }

  quitarTarjetaDesliza(i: number): void {
    if (!this.preguntaEditando || this.preguntaEditando.deslizaTarjetas.length <= 1) return;
    this.preguntaEditando.deslizaTarjetas.splice(i, 1);
  }

  agregarItemOrdenar(): void {
    if (!this.preguntaEditando) return;
    const id = String(this.preguntaEditando.items.length + 1);
    this.preguntaEditando.items.push({ id, texto: '' });
  }

  quitarItemOrdenar(i: number): void {
    this.preguntaEditando?.items.splice(i, 1);
  }

  /** El número de huecos se deriva de cuántas veces aparece "___" en el texto — se
   *  resincroniza el arreglo de respuestas cada vez que el texto cambia. */
  onCambioTextoHuecos(): void {
    if (!this.preguntaEditando) return;
    const cantidad = (this.preguntaEditando.textoHuecos.match(/___/g) || []).length;
    const actuales = this.preguntaEditando.respuestasHuecos;
    this.preguntaEditando.respuestasHuecos =
      cantidad > actuales.length
        ? [...actuales, ...Array(cantidad - actuales.length).fill('')]
        : actuales.slice(0, cantidad);
  }

  agregarConcepto(lado: 'izquierda' | 'derecha'): void {
    if (!this.preguntaEditando) return;
    const lista = this.preguntaEditando[lado];
    const id = (lado === 'izquierda' ? 'i' : 'd') + (lista.length + 1);
    lista.push({ id, texto: '' });
  }

  quitarConcepto(lado: 'izquierda' | 'derecha', i: number): void {
    if (!this.preguntaEditando) return;
    const quitado = this.preguntaEditando[lado].splice(i, 1)[0];
    if (quitado && lado === 'izquierda') delete this.preguntaEditando.parejas[quitado.id];
  }

  /** Arma exactamente el configuracionJson que el reproductor real espera para el tipo
   *  actual — respuestaCorrecta siempre en la MISMA forma que emite cada componente del
   *  reproductor (ver notas en curso.dtos.ts), para que la corrección genérica del
   *  backend (igualdad exacta de JSON) funcione. */
  private construirConfiguracionPregunta(): string {
    return JSON.stringify(construirConfiguracionPlanaDesdePregunta(this.preguntaEditando!));
  }

  /** La vista previa ES el reproductor real (mismo patrón que el lienzo libre): se
   *  reconstruye un CursoSlideDto descartable a partir del formulario en progreso y se le
   *  pasa al mismo componente que usa curso-player — así preview y render real nunca se
   *  desincronizan. El botón "Confirmar respuesta" funciona de verdad (nadie escucha su
   *  evento aquí), lo que de paso deja probar la pregunta antes de guardarla. */
  get previewPreguntaSlide(): CursoSlideDto | null {
    if (!this.preguntaEditando) return null;
    return {
      id: 0,
      cursoId: this.cursoId ?? 0,
      orden: this.preguntaEditando.orden,
      tipoCodigo: this.preguntaEditando.tipoCodigo,
      esEvaluable: true,
      puntaje: this.preguntaEditando.puntaje,
      modoCorreccion: 'igualdad_exacta',
      configuracionJson: this.construirConfiguracionPregunta(),
    };
  }

  guardarPregunta(): void {
    if (!this.preguntaEditando || !this.cursoId) return;
    const p = this.preguntaEditando;
    const dto: CursoSlideUpsertDto = {
      orden: p.orden,
      tipoCodigo: p.tipoCodigo,
      esEvaluable: true,
      puntaje: p.puntaje,
      contarParaNota: p.contarParaNota,
      modoCorreccion: 'igualdad_exacta',
      configuracionJson: this.construirConfiguracionPregunta(),
    };

    const alGuardar = () => {
      this.cerrarPreguntaEditor();
      this.cargarSlides();
    };
    const alFallar = (err: HttpErrorResponse) => {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar la pregunta', text: err.error?.message });
    };

    if (p.id) {
      this.cursoService.actualizarSlide(p.id, dto).subscribe({ next: alGuardar, error: alFallar });
    } else {
      this.cursoService.crearSlide(this.cursoId, dto).subscribe({ next: alGuardar, error: alFallar });
    }
  }

  abrirPestanaBanco(): void {
    this.pestanaSelectorPlantilla = 'banco';
    this.cargarBancoPreguntas();
  }

  cargarBancoPreguntas(): void {
    this.cursoService.getPreguntasBanco(this.filtroTipoBanco || undefined).subscribe({
      next: (res) => {
        this.bancoPreguntas = res;
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  /** Elegir del banco INSERTA la pregunta directo en el curso (crearSlide), sin pasar por
   *  el lienzo libre — abrirla ahí la convertiría a contenido_libre y perdería la
   *  evaluación (ver TIPOS_EVALUABLES arriba). Si luego quieres ajustar el enunciado,
   *  edítala por SQL/backend, no desde este editor. */
  elegirPreguntaBanco(p: CursoPreguntaBancoDto): void {
    if (!this.cursoId) return;
    const dto: CursoSlideUpsertDto = {
      orden: this.slides.length + 1,
      tipoCodigo: p.tipoCodigo,
      esEvaluable: true,
      puntaje: p.puntajeSugerido ?? null,
      modoCorreccion: 'igualdad_exacta',
      configuracionJson: p.configuracionJson,
    };
    this.cursoService.crearSlide(this.cursoId, dto).subscribe({
      next: () => {
        this.mostrarSelectorPlantilla = false;
        Swal.fire({ icon: 'success', title: 'Pregunta agregada', timer: 1400, showConfirmButton: false });
        this.cargarSlides();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo agregar la pregunta', text: err.error?.message });
      },
    });
  }

  /** Guarda una pregunta evaluable YA GUARDADA en el curso (fila real de `slides`, con su
   *  configuracionJson tal cual está en la base) como plantilla reutilizable en el banco. */
  async guardarSlideEnBanco(s: CursoSlideDto): Promise<void> {
    const { value: titulo } = await Swal.fire({
      title: 'Guardar en el banco de preguntas',
      input: 'text',
      inputLabel: 'Título para identificarla después',
      inputValue: this.tituloSlide(s),
      showCancelButton: true,
      confirmButtonText: 'Guardar',
    });
    if (!titulo) return;

    this.cursoService
      .crearPreguntaBanco({
        tipoCodigo: s.tipoCodigo,
        titulo,
        categoria: null,
        puntajeSugerido: s.puntaje ?? null,
        configuracionJson: s.configuracionJson,
      })
      .subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Guardada en el banco', timer: 1400, showConfirmButton: false }),
        error: (err: HttpErrorResponse) =>
          Swal.fire({ icon: 'error', title: 'No se pudo guardar en el banco', text: err.error?.message }),
      });
  }

  /** Punto de entrada seguro para abrir una slide en el lienzo: si es de un tipo evaluable
   *  real (ver TIPOS_EVALUABLES), advierte antes — guardarSlide() la convertiría para
   *  siempre a "contenido_libre" sin evaluación en cuanto se presione "Guardar pantalla". */
  confirmarAbrirSlide(slide: CursoSlideDto): void {
    // Una pregunta insertada como elemento del lienzo libre (estilo Genially) se guarda con
    // tipoCodigo = el tipo de la pregunta (para que el banco/confirmarAbrirSlide la traten
    // como evaluable), pero SÍ trae "elementos" en su configuracionJson — a diferencia de
    // una pregunta heredada/legacy de pantalla completa, que nunca tiene "elementos". Esa
    // es la señal para decidir qué editor abrir sin romper ninguno de los dos casos.
    const tieneElementos = this.slideTraeElementos(slide);
    if (this.TIPOS_EVALUABLES.includes(slide.tipoCodigo) && !tieneElementos) {
      this.abrirPreguntaEditor(slide);
    } else {
      this.editarSlide(slide);
    }
  }

  private slideTraeElementos(slide: CursoSlideDto): boolean {
    try {
      const campos = JSON.parse(slide.configuracionJson || '{}');
      return Array.isArray(campos.elementos);
    } catch {
      return false;
    }
  }

  editarSlide(slide: CursoSlideDto): void {
    let campos: any = {};
    try {
      campos = JSON.parse(slide.configuracionJson || '{}');
    } catch {
      campos = {};
    }

    // Array.isArray(campos.elementos), no el tipoCodigo, decide si ya viene en formato
    // lienzo libre — una pregunta insertada como elemento (ver guardarSlide) se guarda con
    // tipoCodigo = el tipo de la pregunta, pero SÍ trae "elementos" ya armado.
    const elementos: ElementoLibre[] = Array.isArray(campos.elementos)
      ? campos.elementos
      : convertirCamposAElementos(slide.tipoCodigo, campos);

    this.slideEditando = {
      id: slide.id,
      orden: slide.orden,
      campos: { titulo: campos.titulo || '', kicker: campos.kicker || '', elementos, estilo: campos.estilo },
    };
    this.iniciarAutoguardadoParaSlideActual();
    // Puede llegar desde un clic directo (ya repinta solo) o desde el encadenado
    // guardar→recargar→reabrir de irAPagina/cargarSlides (async, sin refresco automático).
    this.cdr.detectChanges();
  }

  /** "Cerrar" del lienzo — ya no hay una grilla de miniaturas a la que volver (el riel
   *  "Páginas" del propio lienzo la reemplaza), así que sale directo a "Administrar cursos". */
  cancelarEdicionSlide(): void {
    this.detenerAutoguardado();
    this.slideEditando = null;
    this.router.navigate(['/cursos/editor']);
  }

  // ---- Navegación entre pantallas sin salir del lienzo (flechas, estilo Genially) ----

  get indicePaginaActual(): number {
    if (!this.slideEditando) return -1;
    return this.slideEditando.id != null
      ? this.slides.findIndex((s) => s.id === this.slideEditando!.id)
      : this.slides.length; // pantalla nueva sin guardar aún: va después de la última
  }

  get puedeIrAnterior(): boolean {
    return this.indicePaginaActual > 0;
  }

  get puedeIrSiguiente(): boolean {
    return this.indicePaginaActual >= 0 && this.indicePaginaActual < this.slides.length - 1;
  }

  irAPagina(delta: -1 | 1): void {
    if (!this.slideEditando) return;
    const indiceDestino = this.indicePaginaActual + delta;
    if (indiceDestino < 0 || indiceDestino >= this.slides.length) return;

    // Guarda la pantalla actual (como el autoguardado de Genially) antes de moverse, para
    // no perder cambios al cambiar de página con las flechas.
    this.guardarSlide(() => {
      const destino = this.slides[indiceDestino];
      if (destino) this.confirmarAbrirSlide(destino);
    });
  }

  /** Clic sobre una miniatura del riel lateral "Páginas" — igual que las flechas, guarda
   *  antes de cambiar. No hace nada si ya es la pantalla abierta. */
  irAPaginaDesde(destino: CursoSlideDto): void {
    if (!this.slideEditando || destino.id === this.slideEditando.id) return;
    this.guardarSlide(() => this.confirmarAbrirSlide(destino));
  }

  // ---- Fondo de la pantalla actual (estilo Genially: color/gradiente detrás de todo) ----

  get fondoLienzoActual(): string | null {
    return this.slideEditando?.campos.estilo?.fondoClaro || null;
  }

  abrirSelectorFondo(): void {
    this.mostrarSelectorFondo = true;
  }

  cerrarSelectorFondo(): void {
    this.mostrarSelectorFondo = false;
  }

  fijarColorFondo(color: string): void {
    if (!this.slideEditando) return;
    const estilo: SlideEstilo = { ...(this.slideEditando.campos.estilo || {}), fondoClaro: color };
    this.slideEditando.campos.estilo = estilo;
  }

  quitarFondo(): void {
    if (!this.slideEditando) return;
    this.slideEditando.campos.estilo = undefined;
  }

  subirImagenFondo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.slideEditando) return;

    this.cursoService.subirImagen(archivo).subscribe({
      next: (res) => {
        const estilo: SlideEstilo = {
          ...(this.slideEditando!.campos.estilo || {}),
          fondoClaro: `url('${res.url}') center / cover no-repeat`,
        };
        this.slideEditando!.campos.estilo = estilo;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo subir la imagen', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  /** Solo afecta a otras pantallas de tipo "contenido_libre": las heredadas (V/F, etc.)
   *  necesitarían pasar antes por la conversión a elementos que hace editarSlide(). */
  aplicarFondoATodasLasPaginas(): void {
    if (!this.slideEditando?.id || !this.slideEditando.campos.estilo) return;
    const estilo = this.slideEditando.campos.estilo;
    const destino = this.slides.filter(
      (s) => s.id !== this.slideEditando!.id && s.tipoCodigo === 'contenido_libre',
    );
    if (!destino.length) {
      Swal.fire({ icon: 'info', title: 'No hay otras pantallas de lienzo libre todavía', timer: 2000, showConfirmButton: false });
      return;
    }
    destino.forEach((s) => {
      let campos: any = {};
      try {
        campos = JSON.parse(s.configuracionJson || '{}');
      } catch {
        campos = {};
      }
      campos.estilo = estilo;
      const dto: CursoSlideUpsertDto = {
        orden: s.orden,
        tipoCodigo: s.tipoCodigo,
        esEvaluable: s.esEvaluable,
        puntaje: s.puntaje ?? null,
        modoCorreccion: s.modoCorreccion ?? 'sin_calificar',
        configuracionJson: JSON.stringify(campos),
      };
      this.cursoService.actualizarSlide(s.id, dto).subscribe();
    });
    Swal.fire({
      icon: 'success',
      title: `Fondo aplicado a ${destino.length} pantalla(s)`,
      timer: 1800,
      showConfirmButton: false,
    });
  }

  // ---- Logo de marca del curso: insertarlo rápido como elemento en el lienzo ----

  abrirSubidaLogo(): void {
    this.fiLogo?.nativeElement.click();
  }

  abrirSubidaFondoImagen(): void {
    this.fiFondo?.nativeElement.click();
  }

  agregarLogoAlLienzo(): void {
    if (!this.curso.logoUrl || !this.slideEditando || !this.canvasEditorRef) return;
    this.canvasEditorRef.agregarElementoImagen(this.curso.logoUrl);
  }

  // ---------------------------------------------------------------------
  // Autoguardado local + historial de versiones (ver ../historial-local.ts)
  // ---------------------------------------------------------------------

  private iniciarAutoguardadoParaSlideActual(): void {
    this.detenerAutoguardado();
    if (!this.slideEditando || this.cursoId == null) return;

    this.claveBorradorActual = claveBorrador(this.cursoId, this.slideEditando.id, this.slideEditando.orden);
    this.ultimoSnapshotAutoguardado = JSON.stringify(this.slideEditando);
    this.ultimoAutoguardadoEn = null;

    const borrador = leerBorrador<typeof this.slideEditando>(this.claveBorradorActual);
    if (borrador && JSON.stringify(borrador.datos) !== this.ultimoSnapshotAutoguardado) {
      const hace = this.formatearTiempoRelativo(borrador.guardadoEn);
      Swal.fire({
        icon: 'question',
        title: 'Se encontró un borrador sin guardar',
        text: `Hay cambios autoguardados de esta pantalla de hace ${hace} que no llegaste a guardar. ¿Quieres recuperarlos?`,
        showCancelButton: true,
        confirmButtonText: 'Recuperar',
        cancelButtonText: 'Descartar',
      }).then((res) => {
        if (res.isConfirmed && this.slideEditando) {
          this.slideEditando = borrador.datos;
          this.ultimoSnapshotAutoguardado = JSON.stringify(this.slideEditando);
        } else if (this.claveBorradorActual) {
          borrarBorrador(this.claveBorradorActual);
        }
        this.cdr.detectChanges();
      });
    }

    this.intervaloAutoguardado = setInterval(() => this.autoguardarSiCambio(), INTERVALO_AUTOGUARDADO_MS);
  }

  private autoguardarSiCambio(): void {
    if (!this.slideEditando || !this.claveBorradorActual) return;
    const snapshot = JSON.stringify(this.slideEditando);
    if (snapshot === this.ultimoSnapshotAutoguardado) return;
    guardarBorrador(this.claveBorradorActual, this.slideEditando);
    this.ultimoSnapshotAutoguardado = snapshot;
    this.ultimoAutoguardadoEn = Date.now();
    this.cdr.detectChanges();
    this.autoguardarAlServidor();
  }

  private detenerAutoguardado(): void {
    if (this.intervaloAutoguardado) {
      clearInterval(this.intervaloAutoguardado);
      this.intervaloAutoguardado = null;
    }
    this.claveBorradorActual = null;
    this.ultimoAutoguardadoEn = null;
  }

  private formatearTiempoRelativo(epochMs: number): string {
    const segundos = Math.round((Date.now() - epochMs) / 1000);
    if (segundos < 60) return `${segundos}s`;
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.round(minutos / 60);
    return `${horas} h`;
  }

  abrirHistorial(): void {
    if (!this.slideEditando?.id) return;
    this.versionesDisponibles = listarVersiones(claveHistorial(this.cursoId!, this.slideEditando.id));
    this.mostrarHistorial = true;
  }

  cerrarHistorial(): void {
    this.mostrarHistorial = false;
  }

  formatearFechaVersion(epochMs: number): string {
    return new Date(epochMs).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  restaurarVersion(version: VersionGuardada): void {
    if (!this.slideEditando) return;
    let campos: any = {};
    try {
      campos = JSON.parse(version.configuracionJson || '{}');
    } catch {
      campos = {};
    }
    const elementos: ElementoLibre[] =
      version.tipoCodigo === 'contenido_libre' ? campos.elementos || [] : convertirCamposAElementos(version.tipoCodigo, campos);
    this.slideEditando.campos = { titulo: campos.titulo || '', kicker: campos.kicker || '', elementos };
    this.mostrarHistorial = false;
    Swal.fire({
      icon: 'info',
      title: 'Versión restaurada en el lienzo',
      text: 'Todavía no se guardó — revisa y presiona "Guardar pantalla" para confirmarla.',
      timer: 2500,
      showConfirmButton: false,
    });
  }

  /** Arma el DTO a persistir a partir de slideEditando — compartido entre guardarSlide()
   *  (guardado manual, cierra el lienzo) y autoguardarAlServidor() (silencioso, en segundo
   *  plano, nunca cierra nada). */
  private construirDtoSlideActual(): { dto: CursoSlideUpsertDto; configuracionJson: string; tipoCodigo: string } {
    // Estilo Genially: si hay un elemento tipo 'pregunta' en el lienzo (máximo uno, ver
    // canvas-editor.agregarElementoPregunta), esta pantalla SÍ es evaluable — se guarda
    // "elementos" completo (para poder renderizar todo el lienzo libre) PERO además, al
    // nivel raíz del JSON, la forma plana que CorregirGenerico espera (enunciado/opciones/
    // respuestaCorrecta/etc.), calculada con el mismo builder que usa el formulario de
    // pantalla completa. Sin pregunta embebida, se comporta exactamente igual que antes.
    const elPregunta = this.slideEditando!.campos.elementos.find((e) => e.tipo === 'pregunta' && e.pregunta);
    const camposPlanos = elPregunta?.pregunta ? construirConfiguracionPlanaDesdePregunta(elPregunta.pregunta, elPregunta) : {};

    const configuracionJson = JSON.stringify({ ...this.slideEditando!.campos, ...camposPlanos });
    const tipoCodigo = elPregunta?.pregunta?.tipoCodigo ?? 'contenido_libre';
    const dto: CursoSlideUpsertDto = {
      orden: this.slideEditando!.orden,
      tipoCodigo,
      esEvaluable: !!elPregunta,
      puntaje: elPregunta?.pregunta?.puntaje ?? null,
      contarParaNota: elPregunta?.pregunta?.contarParaNota ?? true,
      modoCorreccion: elPregunta ? 'igualdad_exacta' : 'sin_calificar',
      configuracionJson,
    };
    return { dto, configuracionJson, tipoCodigo };
  }

  /** Autoguardado silencioso al servidor: corre cada INTERVALO_AUTOGUARDADO_MS mientras
   *  hay cambios sin guardar (ver autoguardarSiCambio), igual que la sincronización
   *  continua de Genially — a diferencia de guardarSlide(), nunca cierra el lienzo ni
   *  navega. Si falla (ej. sin internet), el borrador local ya guardado en paralelo sigue
   *  siendo la red de seguridad hasta el próximo intento. */
  private autoguardarAlServidor(): void {
    if (!this.cursoId || !this.slideEditando) return;
    const { dto } = this.construirDtoSlideActual();

    if (this.slideEditando.id) {
      this.cursoService.actualizarSlide(this.slideEditando.id, dto).subscribe({ error: () => {} });
    } else {
      this.cursoService.crearSlide(this.cursoId, dto).subscribe({
        next: (creada) => {
          if (this.slideEditando) this.slideEditando.id = creada.id;
        },
        error: () => {},
      });
    }
  }

  guardarSlide(alTerminar?: () => void): void {
    if (!this.cursoId || !this.slideEditando) return;

    const { dto, configuracionJson, tipoCodigo } = this.construirDtoSlideActual();
    const idAntesDeGuardar = this.slideEditando.id;
    const alGuardar = (slideGuardada?: CursoSlideDto) => {
      // El id real solo se conoce tras el primer guardado de una slide nueva; para el
      // historial de versiones usamos el id que corresponda (el que ya tenía, o el que
      // acaba de devolver el backend al crearla).
      const idParaHistorial = idAntesDeGuardar ?? slideGuardada?.id;
      if (this.cursoId != null && idParaHistorial != null) {
        agregarVersion(claveHistorial(this.cursoId, idParaHistorial), {
          configuracionJson,
          tipoCodigo,
        });
      }
      if (this.claveBorradorActual) borrarBorrador(this.claveBorradorActual);
      this.detenerAutoguardado();
      if (alTerminar) {
        // Hay una siguiente pantalla que abrir a continuación (flechas de navegación):
        // no vaciamos slideEditando ni repintamos a la grilla — editarSlide() de
        // alTerminar reemplaza el valor directo, sin ese paso intermedio visible.
        this.cargarSlides(alTerminar);
      } else {
        this.slideEditando = null;
        this.cdr.detectChanges();
        this.cargarSlides();
      }
    };
    const alFallar = (err: HttpErrorResponse) => {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar la slide', text: err.error?.message });
      this.cdr.detectChanges();
    };

    if (this.slideEditando.id) {
      this.cursoService
        .actualizarSlide(this.slideEditando.id, dto)
        .subscribe({ next: () => alGuardar(), error: alFallar });
    } else {
      this.cursoService
        .crearSlide(this.cursoId, dto)
        .subscribe({ next: (slideGuardada) => alGuardar(slideGuardada), error: alFallar });
    }
  }

  duplicarSlide(slide: CursoSlideDto): void {
    this.cursoService.duplicarSlide(slide.id).subscribe({
      next: () => this.cargarSlides(),
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo duplicar', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }

  eliminarSlide(slide: CursoSlideDto): void {
    // App zoneless: Swal.fire().then() también corre fuera de Angular, forzamos el refresco.
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar esta pantalla?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cursoService.eliminarSlide(slide.id).subscribe({
        next: () => {
          // Se puede eliminar desde el riel mientras se edita OTRA pantalla — pero si era
          // justo la que está abierta, hay que reabrir otra (o cerrar si ya no queda
          // ninguna): quedaría editando un id que ya no existe.
          const eraLaAbierta = this.slideEditando?.id === slide.id;
          if (eraLaAbierta) {
            this.detenerAutoguardado();
            this.slideEditando = null;
          }
          this.cargarSlides(() => {
            if (eraLaAbierta && this.slides.length) this.confirmarAbrirSlide(this.slides[0]);
          });
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err.error?.message });
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ---------------------------------------------------------------------
  // Subida de imágenes directamente en el campo que corresponde — sube el
  // archivo y setea la URL en el objeto/campo indicado.
  // ---------------------------------------------------------------------

  subirImagenA(objetivo: any, campo: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    this.cursoService.subirImagen(archivo).subscribe({
      next: (res) => {
        // Sentinela de subirImagenCarruselElementoLibre: el carrusel acumula imágenes
        // (cantidad libre), no reemplaza un campo escalar como el resto de los tipos.
        if (campo === '__carrusel_push__') {
          objetivo.carruselImagenes = [...(objetivo.carruselImagenes || []), res.url];
        } else {
          objetivo[campo] = res.url;
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo subir la imagen', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }
}
