import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CursoService } from '../../services/curso.service';
import {
  CursoDto,
  CursoSlideDto,
  ElementoLibre,
  FinalizarIntentoResultDto,
  SlideEstilo,
} from '../../dtos/curso.dtos';

import { SlideContenido } from './slides/slide-contenido/slide-contenido';
import { SlideVerdaderoFalso } from './slides/slide-verdadero-falso/slide-verdadero-falso';
import { SlideOpcionMultiple } from './slides/slide-opcion-multiple/slide-opcion-multiple';
import { SlideMarcarImagen } from './slides/slide-marcar-imagen/slide-marcar-imagen';
import { SlideArrastrarSoltar } from './slides/slide-arrastrar-soltar/slide-arrastrar-soltar';
import { SlideOrdenar } from './slides/slide-ordenar/slide-ordenar';
import { SlideTarjetas } from './slides/slide-tarjetas/slide-tarjetas';
import { SlideGaleriaZoom } from './slides/slide-galeria-zoom/slide-galeria-zoom';
import { SlideContenidoLibre } from './slides/slide-contenido-libre/slide-contenido-libre';
import { SlideRespuestaCorta } from './slides/slide-respuesta-corta/slide-respuesta-corta';
import { SlideCompletarHuecos } from './slides/slide-completar-huecos/slide-completar-huecos';
import { SlideEmparejarConceptos } from './slides/slide-emparejar-conceptos/slide-emparejar-conceptos';
import { SlideEleccionMultiple } from './slides/slide-eleccion-multiple/slide-eleccion-multiple';
import { SlideDeslizaAcierta } from './slides/slide-desliza-acierta/slide-desliza-acierta';
import { FondoAnimado } from './fondo-animado/fondo-animado';

const DECLARACION_TEXTO =
  'Declaro bajo juramento que soy la persona identificada en mi cuenta y que he respondido ' +
  'personalmente esta evaluación, sin ayuda de terceros, entendiendo que esta información podrá ' +
  'ser utilizada como medio probatorio ante SUNAFIL u otra autoridad.';

type Fase = 'cargando' | 'jugando' | 'feedback' | 'declaracion' | 'finalizando' | 'resultado' | 'error';

@Component({
  selector: 'app-curso-player',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SlideContenido,
    SlideVerdaderoFalso,
    SlideOpcionMultiple,
    SlideMarcarImagen,
    SlideArrastrarSoltar,
    SlideOrdenar,
    SlideTarjetas,
    SlideGaleriaZoom,
    SlideContenidoLibre,
    SlideRespuestaCorta,
    SlideCompletarHuecos,
    SlideEmparejarConceptos,
    SlideEleccionMultiple,
    SlideDeslizaAcierta,
    FondoAnimado,
  ],
  templateUrl: './curso-player.html',
  styleUrl: './curso-player.css',
})
export class CursoPlayer implements OnInit {
  cursoId!: number;
  curso: CursoDto | null = null;
  slides: CursoSlideDto[] = [];
  currentIndex = 0;
  intentoId: number | null = null;

  fase: Fase = 'cargando';
  errorMensaje = '';

  ultimaEsCorrecta: boolean | null = null;
  ultimoPuntaje: number | null = null;

  declaracionAceptada = false;
  resultado: FinalizarIntentoResultDto | null = null;

  private tiempoInicioSlide = Date.now();

  declaracionTexto = DECLARACION_TEXTO;

  @ViewChild(SlideContenidoLibre) private slideLibreRef?: SlideContenidoLibre;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.cursoId = Number(idParam);
    if (!this.cursoId) {
      this.fase = 'error';
      this.errorMensaje = 'Curso no válido.';
      return;
    }
    this.cargarCurso();
  }

  get slideActual(): CursoSlideDto | null {
    return this.slides[this.currentIndex] ?? null;
  }

  get progresoTexto(): string {
    return `${this.currentIndex + 1} / ${this.slides.length}`;
  }

  get progresoPorcentaje(): number {
    if (!this.slides.length) return 0;
    return Math.round(((this.currentIndex + 1) / this.slides.length) * 100);
  }

  get esUltimaSlide(): boolean {
    return this.currentIndex >= this.slides.length - 1;
  }

  // Estilo opcional declarado en configuracionJson de la slide actual (ver SlideEstilo).
  // Puramente de presentación para el fondo animado; no afecta la lógica de responder/avanzar.
  get estiloSlideActual(): SlideEstilo | undefined {
    const slide = this.slideActual;
    if (!slide) return undefined;
    try {
      const config = JSON.parse(slide.configuracionJson || '{}');
      return config?.estilo;
    } catch {
      return undefined;
    }
  }

  /** La pregunta embebida en el lienzo libre de la slide actual (si la hay), para que el
   *  overlay de feedback (ver curso-player.html) pueda mostrar su mensaje personalizado
   *  "tras responder" y/o la respuesta correcta configurados en la pestaña Acciones. */
  get elementoPreguntaFeedback(): ElementoLibre | undefined {
    const slide = this.slideActual;
    if (!slide) return undefined;
    try {
      const config = JSON.parse(slide.configuracionJson || '{}');
      const elementos: ElementoLibre[] = config?.elementos || [];
      return elementos.find((e) => e.tipo === 'pregunta' && e.pregunta);
    } catch {
      return undefined;
    }
  }

  /** Texto legible de la respuesta correcta de la pregunta embebida actual, para
   *  "Mostrar respuesta correcta" en el overlay de feedback. */
  get textoRespuestaCorrectaFeedback(): string {
    const preg = this.elementoPreguntaFeedback?.pregunta;
    if (!preg) return '';
    switch (preg.tipoCodigo) {
      case 'pregunta_vf':
      case 'pregunta_opcion_multiple':
      case 'pregunta_eleccion_multiple':
        return preg.opciones
          .filter((o) => o.correcta)
          .map((o) => o.texto)
          .join(', ');
      case 'pregunta_respuesta_corta':
        return preg.respuestaTexto;
      case 'pregunta_ordenar':
        return preg.items.map((i) => i.texto).join(' → ');
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------

  private cargarCurso(): void {
    this.fase = 'cargando';
    this.cursoService.getSlides(this.cursoId).subscribe({
      next: (slides) => {
        this.slides = [...slides].sort((a, b) => a.orden - b.orden);
        this.iniciarConGeolocalizacion();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.fase = 'error';
        this.errorMensaje = err.error?.message ?? 'No se pudo cargar el curso.';
        this.cdr.detectChanges();
      },
    });
  }

  private iniciarConGeolocalizacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.iniciarIntento(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.iniciarIntento({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precisionGpsMetros: pos.coords.accuracy,
        });
      },
      () => {
        // El usuario rechazó el permiso o falló la geolocalización: se continúa igual,
        // el intento se registra sin coordenadas.
        this.iniciarIntento(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  private generarDeviceFingerprint(): string {
    try {
      const partes = [
        navigator.userAgent,
        String(screen.width),
        String(screen.height),
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      ].join('|');

      let hash = 0;
      for (let i = 0; i < partes.length; i++) {
        hash = (hash << 5) - hash + partes.charCodeAt(i);
        hash |= 0;
      }
      return `fp_${Math.abs(hash)}`;
    } catch {
      return 'fp_desconocido';
    }
  }

  private iniciarIntento(
    geo: { latitud: number; longitud: number; precisionGpsMetros: number } | null,
  ): void {
    this.cursoService
      .iniciarIntento({
        cursoId: this.cursoId,
        latitud: geo?.latitud ?? null,
        longitud: geo?.longitud ?? null,
        precisionGpsMetros: geo?.precisionGpsMetros ?? null,
        deviceFingerprint: this.generarDeviceFingerprint(),
      })
      .subscribe({
        next: (res) => {
          this.intentoId = res.intentoId;
          this.currentIndex = 0;
          this.tiempoInicioSlide = Date.now();
          this.fase = 'jugando';
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.fase = 'error';
          this.errorMensaje = err.error?.message ?? 'No se pudo iniciar el curso.';
          this.cdr.detectChanges();
        },
      });
  }

  // ---------------------------------------------------------------------
  // Respuesta a cada slide
  // ---------------------------------------------------------------------

  onRespuesta(respuestaJson: any): void {
    const slide = this.slideActual;
    if (!slide || !this.intentoId) return;

    const tiempoSeg = Math.round((Date.now() - this.tiempoInicioSlide) / 1000);

    this.cursoService
      .responder(this.intentoId, {
        slideId: slide.id,
        respuestaJson: JSON.stringify(respuestaJson),
        tiempoRespuestaSeg: tiempoSeg,
      })
      .subscribe({
        next: (res) => {
          this.ultimaEsCorrecta = res.esCorrecta ?? null;
          this.ultimoPuntaje = res.puntajeObtenido ?? null;

          if (!slide.esEvaluable) {
            // Slide de contenido: avanza directo, sin overlay de feedback.
            this.avanzar();
            return;
          }

          this.fase = 'feedback';
          this.cdr.detectChanges();

          const elPregunta = this.elementoPreguntaFeedback;
          // pregunta_emparejar y pregunta_desliza_acierta no tienen el selector "Al
          // contestar/Según el resultado" (ver los bloques "Acciones de Emparejar
          // conceptos"/"Acciones de Desliza y acierta" en canvas-editor.html) — sus ramas
          // Acierto/Error están siempre activas, no detrás de preguntaMensajesActivos.
          const esEmparejar = elPregunta?.pregunta?.tipoCodigo === 'pregunta_emparejar';
          const esDeslizaAcierta = elPregunta?.pregunta?.tipoCodigo === 'pregunta_desliza_acierta';
          const rama =
            elPregunta?.preguntaMensajesActivos || esEmparejar || esDeslizaAcierta
              ? this.ultimaEsCorrecta === true
                ? elPregunta?.preguntaAccionAcierto
                : elPregunta?.preguntaAccionError
              : undefined;
          const hayMensajePersonalizado = !!elPregunta?.preguntaMensajesActivos || !!elPregunta?.preguntaMensajesSimplesActivos;

          // Las acciones que no sean "ir a página" (audio, abrir ventana, efecto, mostrar/
          // ocultar elemento, scroll) se disparan de inmediato, para que tengan toda la
          // ventana de feedback (1400/3000ms) visibles/audibles antes de avanzar. "Al
          // finalizar la actividad" (solo emparejar) se dispara siempre, acierte o no.
          const accionesFinActividad = esEmparejar ? (elPregunta?.preguntaAccionFinActividad?.acciones ?? []) : [];
          const accionesInmediatas = [...(rama?.acciones ?? []), ...accionesFinActividad].filter((a) => a.tipo !== 'pagina');
          if (accionesInmediatas.length) this.slideLibreRef?.ejecutarAccionesPregunta(accionesInmediatas);
          const accionPagina =
            (rama?.acciones ?? []).find((a) => a.tipo === 'pagina' && a.slideId) ??
            accionesFinActividad.find((a) => a.tipo === 'pagina' && a.slideId);

          setTimeout(
            () => {
              if (accionPagina) {
                this.onIrAPagina(accionPagina.slideId!);
              } else {
                this.avanzar();
              }
            },
            hayMensajePersonalizado ? 3000 : 1400,
          );
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo registrar tu respuesta',
            text: err.error?.message ?? 'Intenta nuevamente.',
          });
        },
      });
  }

  /** Botón "Ir a página" de una slide de lienzo libre: salto directo, sin registrar
   *  respuesta (es navegación, no una pregunta evaluada). */
  async onIrAPagina(slideId: number): Promise<void> {
    const indice = this.slides.findIndex((s) => s.id === slideId);
    if (indice < 0) return;
    await this.slideLibreRef?.dispararSalida();
    this.currentIndex = indice;
    this.tiempoInicioSlide = Date.now();
    this.fase = 'jugando';
    this.cdr.detectChanges();
  }

  /** Barra lateral fija, estilo Genially — pero acotada a lo que la evaluación permite:
   *  a diferencia de la vista previa de la plantilla (navegación libre, sin consecuencias),
   *  acá cada respuesta queda registrada contra un intento con declaración jurada, así que
   *  NUNCA se puede retroceder ni saltar una pregunta evaluable sin responderla. Solo sirve
   *  como una forma más visible de "Continuar" para pantallas de puro contenido (sin botón
   *  propio) o justo después de responder, mientras se ve el feedback. */
  get puedeAvanzarDesdeRail(): boolean {
    if (this.fase === 'feedback') return false; // ya avanza solo, no interferir con el timeout
    if (this.fase !== 'jugando') return false;
    return !this.slideActual?.esEvaluable;
  }

  avanzarDesdeRail(): void {
    if (!this.puedeAvanzarDesdeRail) return;
    this.onRespuesta({ visto: true });
  }

  private async avanzar(): Promise<void> {
    await this.slideLibreRef?.dispararSalida();

    if (this.esUltimaSlide) {
      this.fase = 'declaracion';
    } else {
      this.currentIndex++;
      this.tiempoInicioSlide = Date.now();
      this.fase = 'jugando';
    }
    this.cdr.detectChanges();
  }

  // ---------------------------------------------------------------------
  // Declaración jurada + finalización
  // ---------------------------------------------------------------------

  finalizarEvaluacion(): void {
    if (!this.declaracionAceptada || !this.intentoId) return;

    this.fase = 'finalizando';
    this.cursoService
      .finalizar(this.intentoId, {
        declaracionJuradaAceptada: true,
        declaracionTexto: this.declaracionTexto,
      })
      .subscribe({
        next: (res) => {
          this.resultado = res;
          this.fase = 'resultado';
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.fase = 'declaracion';
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'error',
            title: 'No se pudo finalizar la evaluación',
            text: err.error?.message ?? 'Intenta nuevamente.',
          });
        },
      });
  }

  volverALista(): void {
    this.router.navigate(['/cursos']);
  }
}
