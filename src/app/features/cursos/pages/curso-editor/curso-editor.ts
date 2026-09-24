import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CursoService } from '../../services/curso.service';
import { CursoDto, CursoSlideDto, CursoUpsertDto, CursoSlideUpsertDto } from '../../dtos/curso.dtos';
import { SLIDE_TIPOS, resolverEtiquetaSlide } from '../curso-player/slide-tipo-registro';
import { FondoAnimado } from '../curso-player/fondo-animado/fondo-animado';
import { SlideContenido } from '../curso-player/slides/slide-contenido/slide-contenido';
import { SlideVerdaderoFalso } from '../curso-player/slides/slide-verdadero-falso/slide-verdadero-falso';
import { SlideOpcionMultiple } from '../curso-player/slides/slide-opcion-multiple/slide-opcion-multiple';
import { SlideOrdenar } from '../curso-player/slides/slide-ordenar/slide-ordenar';
import { SlideTarjetas } from '../curso-player/slides/slide-tarjetas/slide-tarjetas';
import { SlideGaleriaZoom } from '../curso-player/slides/slide-galeria-zoom/slide-galeria-zoom';

let idCorrelativo = 1;
function nuevoId(): string {
  return `n${Date.now()}_${idCorrelativo++}`;
}

// Forma inicial de "campos" (el objeto que sí se edita con formulario) por tipo nuevo.
function camposIniciales(tipoCodigo: string): any {
  switch (tipoCodigo) {
    case 'contenido_texto':
      return { kicker: 'INTRODUCCIÓN', titulo: '', texto: '', imagenUrl: '' };
    case 'contenido_tarjetas':
      return { kicker: 'DETALLE', titulo: '', tarjetas: [] };
    case 'contenido_galeria_zoom':
      return { kicker: 'EVIDENCIA', titulo: '', imagenes: [] };
    case 'pregunta_vf':
      return { enunciado: '', imagenUrl: '', respuestaCorrecta: true };
    case 'pregunta_opcion_multiple':
      return { enunciado: '', opciones: [], respuestaCorrecta: '' };
    case 'pregunta_ordenar':
      return { enunciado: '', items: [] };
    default:
      return {};
  }
}

// Plantilla JSON de partida para los tipos que aún no tienen formulario dedicado.
const PLANTILLAS_JSON_FALLBACK: Record<string, string> = {
  pregunta_imagen: JSON.stringify(
    { enunciado: '', imagenes: [{ id: '1', texto: '', imagenUrl: '' }] },
    null,
    2,
  ),
  pregunta_arrastrar: JSON.stringify(
    { enunciado: '', items: [{ id: '1', texto: '' }], zonas: [{ id: '1', texto: '' }] },
    null,
    2,
  ),
};

// Tipos con formulario dedicado (los demás caen a un editor JSON crudo como respaldo).
const TIPOS_CON_FORMULARIO = new Set([
  'contenido_texto',
  'contenido_tarjetas',
  'contenido_galeria_zoom',
  'pregunta_vf',
  'pregunta_opcion_multiple',
  'pregunta_ordenar',
]);

@Component({
  selector: 'app-curso-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FondoAnimado,
    SlideContenido,
    SlideVerdaderoFalso,
    SlideOpcionMultiple,
    SlideOrdenar,
    SlideTarjetas,
    SlideGaleriaZoom,
  ],
  templateUrl: './curso-editor.html',
  styleUrl: './curso-editor.css',
})
export class CursoEditor implements OnInit {
  tiposDisponibles = SLIDE_TIPOS;

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

  // Slide en edición dentro del formulario (nueva o existente).
  slideEditando: {
    id: number | null;
    orden: number;
    tipoCodigo: string;
    esEvaluable: boolean;
    puntaje: number | null;
    modoCorreccion: string;
    tieneFormulario: boolean;
    campos: any; // objeto editado por el formulario (tiene forma distinta por tipoCodigo)
    configuracionJson: string; // solo se usa si tieneFormulario = false (respaldo JSON crudo)
  } | null = null;

  subiendoImagenGlobal = false;

  @ViewChild('fiPreview') private fiPreview?: ElementRef<HTMLInputElement>;
  private objetivoSubidaPreview: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
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

  private cargarTodosLosCursos(): void {
    this.cargando = true;
    this.cursoService.getCursosAdmin().subscribe({
      next: (cursos) => {
        this.todosLosCursos = cursos;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
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

  // Reconstruye el CursoSlideDto "en vivo" a partir de lo que se va escribiendo en el
  // formulario, para pasárselo al mismo componente real del player como vista previa.
  // Angular vuelve a llamar este getter en cada ciclo de detección de cambios, así que
  // la preview queda sincronizada con lo que se escribe sin lógica adicional.
  get previewSlide(): CursoSlideDto | null {
    if (!this.slideEditando) return null;
    const campos = this.slideEditando.tieneFormulario
      ? this.slideEditando.campos
      : (() => {
          try {
            return JSON.parse(this.slideEditando!.configuracionJson || '{}');
          } catch {
            return {};
          }
        })();

    return {
      id: this.slideEditando.id ?? -1,
      cursoId: this.cursoId ?? -1,
      orden: this.slideEditando.orden,
      tipoCodigo: this.slideEditando.tipoCodigo,
      esEvaluable: this.slideEditando.esEvaluable,
      puntaje: this.slideEditando.puntaje,
      modoCorreccion: this.slideEditando.modoCorreccion,
      configuracionJson: JSON.stringify(campos),
    };
  }

  /** No-op: la preview no debe avanzar de pantalla ni registrar respuestas reales. */
  onRespuestaPreview(): void {}

  // ---- Clic directo sobre la imagen dentro de la vista previa en vivo ----

  clicImagenContenido(): void {
    this.dispararUploadPreview(this.slideEditando!.campos);
  }

  clicImagenTarjeta(index: number): void {
    this.dispararUploadPreview(this.slideEditando!.campos.tarjetas[index]);
  }

  clicImagenGaleria(index: number): void {
    this.dispararUploadPreview(this.slideEditando!.campos.imagenes[index]);
  }

  private dispararUploadPreview(objetivo: any): void {
    this.objetivoSubidaPreview = objetivo;
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
      },
    });
  }

  private cargarSlides(): void {
    if (!this.cursoId) return;
    this.cursoService.getSlidesAdmin(this.cursoId).subscribe({
      next: (slides) => {
        this.slides = [...slides].sort((a, b) => a.orden - b.orden);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  guardarCurso(): void {
    if (!this.curso.titulo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta el título del curso' });
      return;
    }

    if (this.cursoId) {
      this.cursoService.actualizarCurso(this.cursoId, this.curso).subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Curso actualizado', timer: 1200, showConfirmButton: false }),
        error: (err: HttpErrorResponse) =>
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err.error?.message }),
      });
    } else {
      this.cursoService.crearCurso(this.curso).subscribe({
        next: (nuevo) => {
          this.cursoId = nuevo.id;
          this.router.navigate(['/cursos/editor', nuevo.id]);
          Swal.fire({ icon: 'success', title: 'Curso creado', timer: 1200, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) =>
          Swal.fire({ icon: 'error', title: 'No se pudo crear el curso', text: err.error?.message }),
      });
    }
  }

  // ---------------------------------------------------------------------
  // Slides
  // ---------------------------------------------------------------------

  nuevaSlide(tipoCodigo: string): void {
    const tieneFormulario = TIPOS_CON_FORMULARIO.has(tipoCodigo);
    this.slideEditando = {
      id: null,
      orden: this.slides.length + 1,
      tipoCodigo,
      esEvaluable: tipoCodigo.startsWith('pregunta_'),
      puntaje: tipoCodigo.startsWith('pregunta_') ? 2 : null,
      modoCorreccion: tipoCodigo.startsWith('pregunta_') ? 'igualdad_exacta' : 'sin_calificar',
      tieneFormulario,
      campos: camposIniciales(tipoCodigo),
      configuracionJson: PLANTILLAS_JSON_FALLBACK[tipoCodigo] ?? '{}',
    };
  }

  editarSlide(slide: CursoSlideDto): void {
    const tieneFormulario = TIPOS_CON_FORMULARIO.has(slide.tipoCodigo);
    let campos: any = {};
    try {
      campos = JSON.parse(slide.configuracionJson || '{}');
    } catch {
      campos = {};
    }

    this.slideEditando = {
      id: slide.id,
      orden: slide.orden,
      tipoCodigo: slide.tipoCodigo,
      esEvaluable: slide.esEvaluable,
      puntaje: slide.puntaje ?? null,
      modoCorreccion: slide.modoCorreccion ?? '',
      tieneFormulario,
      campos,
      configuracionJson: slide.configuracionJson,
    };
  }

  cancelarEdicionSlide(): void {
    this.slideEditando = null;
  }

  // ---- Helpers de arrays para las plantillas con formulario ----

  agregarTarjeta(): void {
    if (!this.slideEditando) return;
    if (!this.slideEditando.campos.tarjetas) this.slideEditando.campos.tarjetas = [];
    this.slideEditando.campos.tarjetas.push({
      id: nuevoId(),
      titulo: '',
      texto: '',
      imagenUrl: '',
      descripcion: '',
    });
  }

  quitarTarjeta(index: number): void {
    this.slideEditando?.campos.tarjetas.splice(index, 1);
  }

  agregarImagenGaleria(): void {
    if (!this.slideEditando) return;
    if (!this.slideEditando.campos.imagenes) this.slideEditando.campos.imagenes = [];
    this.slideEditando.campos.imagenes.push({ id: nuevoId(), imagenUrl: '', caption: '' });
  }

  quitarImagenGaleria(index: number): void {
    this.slideEditando?.campos.imagenes.splice(index, 1);
  }

  agregarOpcion(): void {
    if (!this.slideEditando) return;
    if (!this.slideEditando.campos.opciones) this.slideEditando.campos.opciones = [];
    this.slideEditando.campos.opciones.push({ id: nuevoId(), texto: '' });
  }

  quitarOpcion(index: number): void {
    const campos = this.slideEditando?.campos;
    if (!campos) return;
    const id = campos.opciones[index]?.id;
    campos.opciones.splice(index, 1);
    if (campos.respuestaCorrecta === id) campos.respuestaCorrecta = '';
  }

  agregarItemOrdenar(): void {
    if (!this.slideEditando) return;
    if (!this.slideEditando.campos.items) this.slideEditando.campos.items = [];
    this.slideEditando.campos.items.push({ id: nuevoId(), texto: '' });
  }

  quitarItemOrdenar(index: number): void {
    this.slideEditando?.campos.items.splice(index, 1);
  }

  moverItemOrdenar(index: number, direccion: -1 | 1): void {
    const items = this.slideEditando?.campos.items;
    if (!items) return;
    const destino = index + direccion;
    if (destino < 0 || destino >= items.length) return;
    [items[index], items[destino]] = [items[destino], items[index]];
  }

  guardarSlide(): void {
    if (!this.cursoId || !this.slideEditando) return;

    let configuracionJson: string;

    if (this.slideEditando.tieneFormulario) {
      const campos = { ...this.slideEditando.campos };

      // "pregunta_ordenar" evalúa igualdad exacta: la respuesta correcta es el orden
      // en que el autor dejó los items en la lista (arriba = primero).
      if (this.slideEditando.tipoCodigo === 'pregunta_ordenar') {
        campos.respuestaCorrecta = (campos.items || []).map((i: any) => i.id);
      }

      configuracionJson = JSON.stringify(campos);
    } else {
      try {
        JSON.parse(this.slideEditando.configuracionJson || '{}');
      } catch {
        Swal.fire({ icon: 'error', title: 'El JSON de configuración no es válido' });
        return;
      }
      configuracionJson = this.slideEditando.configuracionJson;
    }

    const dto: CursoSlideUpsertDto = {
      orden: this.slideEditando.orden,
      tipoCodigo: this.slideEditando.tipoCodigo,
      esEvaluable: this.slideEditando.esEvaluable,
      puntaje: this.slideEditando.puntaje,
      modoCorreccion: this.slideEditando.modoCorreccion || null,
      configuracionJson,
    };

    const alGuardar = () => {
      this.slideEditando = null;
      this.cargarSlides();
    };
    const alFallar = (err: HttpErrorResponse) =>
      Swal.fire({ icon: 'error', title: 'No se pudo guardar la slide', text: err.error?.message });

    if (this.slideEditando.id) {
      this.cursoService
        .actualizarSlide(this.slideEditando.id, dto)
        .subscribe({ next: alGuardar, error: alFallar });
    } else {
      this.cursoService
        .crearSlide(this.cursoId, dto)
        .subscribe({ next: alGuardar, error: alFallar });
    }
  }

  duplicarSlide(slide: CursoSlideDto): void {
    this.cursoService.duplicarSlide(slide.id).subscribe({
      next: () => this.cargarSlides(),
      error: (err: HttpErrorResponse) =>
        Swal.fire({ icon: 'error', title: 'No se pudo duplicar', text: err.error?.message }),
    });
  }

  eliminarSlide(slide: CursoSlideDto): void {
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
        error: (err: HttpErrorResponse) =>
          Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err.error?.message }),
      });
    });
  }

  // ---------------------------------------------------------------------
  // Subida de imágenes directamente en el campo que corresponde (portada,
  // tarjeta N, celda de galería, etc.) — sube el archivo y setea la URL en
  // el objeto/campo indicado, sin pasar por ningún JSON visible.
  // ---------------------------------------------------------------------

  subirImagenA(objetivo: any, campo: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    this.subiendoImagenGlobal = true;
    this.cursoService.subirImagen(archivo).subscribe({
      next: (res) => {
        objetivo[campo] = res.url;
        this.subiendoImagenGlobal = false;
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagenGlobal = false;
        Swal.fire({ icon: 'error', title: 'No se pudo subir la imagen', text: err.error?.message });
      },
    });
  }
}
