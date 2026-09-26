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
  ElementoLibre,
  SlideEstilo,
  CursoPreguntaBancoDto,
} from '../../dtos/curso.dtos';
import { resolverEtiquetaSlide } from '../curso-player/slide-tipo-registro';
import { CanvasEditor } from './canvas-editor/canvas-editor';
import { ColorHexInput } from '../../shared/color-hex-input/color-hex-input';
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

  subirAudioElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.campoSubidaPreview = 'audioUrl';
    this.fiPreview?.nativeElement.click();
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
    };

    if (slide.tipoCodigo === 'pregunta_vf' || slide.tipoCodigo === 'pregunta_desliza_acierta') {
      this.preguntaEditando!.opciones = [
        { id: 'true', texto: 'Verdadero', imagenUrl: '', correcta: rc.valor === true },
        { id: 'false', texto: 'Falso', imagenUrl: '', correcta: rc.valor === false },
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

  cancelarEdicionSlide(): void {
    this.detenerAutoguardado();
    this.slideEditando = null;
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

  guardarSlide(alTerminar?: () => void): void {
    if (!this.cursoId || !this.slideEditando) return;

    // Estilo Genially: si hay un elemento tipo 'pregunta' en el lienzo (máximo uno, ver
    // canvas-editor.agregarElementoPregunta), esta pantalla SÍ es evaluable — se guarda
    // "elementos" completo (para poder renderizar todo el lienzo libre) PERO además, al
    // nivel raíz del JSON, la forma plana que CorregirGenerico espera (enunciado/opciones/
    // respuestaCorrecta/etc.), calculada con el mismo builder que usa el formulario de
    // pantalla completa. Sin pregunta embebida, se comporta exactamente igual que antes.
    const elPregunta = this.slideEditando.campos.elementos.find((e) => e.tipo === 'pregunta' && e.pregunta);
    const camposPlanos = elPregunta?.pregunta ? construirConfiguracionPlanaDesdePregunta(elPregunta.pregunta) : {};

    const configuracionJson = JSON.stringify({ ...this.slideEditando.campos, ...camposPlanos });
    const tipoCodigo = elPregunta?.pregunta?.tipoCodigo ?? 'contenido_libre';
    const dto: CursoSlideUpsertDto = {
      orden: this.slideEditando.orden,
      tipoCodigo,
      esEvaluable: !!elPregunta,
      puntaje: elPregunta?.pregunta?.puntaje ?? null,
      contarParaNota: elPregunta?.pregunta?.contarParaNota ?? true,
      modoCorreccion: elPregunta ? 'igualdad_exacta' : 'sin_calificar',
      configuracionJson,
    };

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
        next: () => this.cargarSlides(),
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
        objetivo[campo] = res.url;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        Swal.fire({ icon: 'error', title: 'No se pudo subir la imagen', text: err.error?.message });
        this.cdr.detectChanges();
      },
    });
  }
}
