import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CursoService } from '../../services/curso.service';
import { CursoDto, CursoSlideDto, CursoUpsertDto, CursoSlideUpsertDto, ElementoLibre } from '../../dtos/curso.dtos';
import { resolverEtiquetaSlide } from '../curso-player/slide-tipo-registro';
import { CanvasEditor } from './canvas-editor/canvas-editor';
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
import { CANVAS_ANCHO, CANVAS_ALTO } from '../curso-player/slides/slide-contenido-libre/slide-contenido-libre';

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
  imports: [CommonModule, FormsModule, RouterLink, CanvasEditor],
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
    campos: { titulo: string; kicker?: string; elementos: ElementoLibre[] };
  } | null = null;

  mostrarSelectorPlantilla = false;
  plantillasDisponibles = PLANTILLAS_LIBRE;
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
  private primerCargaSlides = true;

  // ---- Autoguardado + historial de versiones (ver ../historial-local.ts) ----
  ultimoAutoguardadoEn: number | null = null;
  mostrarHistorial = false;
  versionesDisponibles: VersionGuardada[] = [];
  private claveBorradorActual: string | null = null;
  private ultimoSnapshotAutoguardado = '';
  private intervaloAutoguardado: ReturnType<typeof setInterval> | null = null;

  @ViewChild('fiPreview') private fiPreview?: ElementRef<HTMLInputElement>;
  private objetivoSubidaPreview: any = null;

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

  subirImagenElementoLibre(el: ElementoLibre): void {
    this.objetivoSubidaPreview = el;
    this.fiPreview?.nativeElement.click();
  }

  onArchivoPreviewSeleccionado(event: Event): void {
    if (this.objetivoSubidaPreview) {
      this.subirImagenA(this.objetivoSubidaPreview, 'imagenUrl', event);
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

  editarSlide(slide: CursoSlideDto): void {
    let campos: any = {};
    try {
      campos = JSON.parse(slide.configuracionJson || '{}');
    } catch {
      campos = {};
    }

    const elementos: ElementoLibre[] =
      slide.tipoCodigo === 'contenido_libre' ? campos.elementos || [] : convertirCamposAElementos(slide.tipoCodigo, campos);

    this.slideEditando = {
      id: slide.id,
      orden: slide.orden,
      campos: { titulo: campos.titulo || '', kicker: campos.kicker || '', elementos },
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

  /** Guarda la pantalla actual y muestra la grilla completa — a diferencia de "Cancelar"
   *  (que descarta), esto es una vista deliberada de todas las pantallas, no una salida. */
  verGrilla(): void {
    this.guardarSlide();
  }

  irAPagina(delta: -1 | 1): void {
    if (!this.slideEditando) return;
    const indiceDestino = this.indicePaginaActual + delta;
    if (indiceDestino < 0 || indiceDestino >= this.slides.length) return;

    // Guarda la pantalla actual (como el autoguardado de Genially) antes de moverse, para
    // no perder cambios al cambiar de página con las flechas.
    this.guardarSlide(() => {
      const destino = this.slides[indiceDestino];
      if (destino) this.editarSlide(destino);
    });
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

    const configuracionJson = JSON.stringify(this.slideEditando.campos);
    const dto: CursoSlideUpsertDto = {
      orden: this.slideEditando.orden,
      tipoCodigo: 'contenido_libre',
      esEvaluable: false,
      puntaje: null,
      modoCorreccion: 'sin_calificar',
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
          tipoCodigo: 'contenido_libre',
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
