import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Cámara embebida para selfies con timestamp. Nunca sube nada por sí sola — solo captura un
 * frame a base64 JPEG cuando el padre llama a `capturarFoto()`. Si el navegador niega el permiso
 * o no hay cámara, muestra un estado de error claro con reintento (nunca una pantalla en blanco).
 */
@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.css',
})
export class CameraCapture implements OnInit, OnDestroy {
  @Input() facingMode: 'user' | 'environment' = 'user';
  /** Líneas de texto a "quemar" sobre la selfie (fecha/hora, proyecto, coordenadas, trabajador…)
   *  — mismo criterio que las apps de cámara con marca de tiempo: no es un metadato EXIF que se
   *  pueda quitar editando la foto, queda dibujado en los píxeles. El padre las arma con lo que
   *  tenga disponible en ese momento (la ubicación puede llegar después de que la cámara ya esté
   *  lista) y las vuelve a pasar antes de llamar a capturarFoto(). */
  @Input() overlayLineas: string[] = [];
  /** Se emite cuando el video ya está reproduciendo — el padre puede usar `videoElement` para
   * calcular el embedding facial en vivo antes de que el usuario capture. */
  @Output() listo = new EventEmitter<void>();
  @Output() errorCamara = new EventEmitter<string>();

  @ViewChild('video', { static: true }) private videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  cargando = true;
  mensajeError: string | null = null;
  private stream: MediaStream | null = null;

  get videoElement(): HTMLVideoElement {
    return this.videoRef.nativeElement;
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.iniciar();
  }

  ngOnDestroy(): void {
    this.detener();
  }

  async iniciar(): Promise<void> {
    this.cargando = true;
    this.mensajeError = null;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.mensajeError = 'Este navegador no permite acceder a la cámara. Usa Chrome o Safari actualizado.';
      this.cargando = false;
      this.cdr.detectChanges();
      this.errorCamara.emit(this.mensajeError);
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode, width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cargando = false;
      this.cdr.detectChanges();
      this.listo.emit();
    } catch (err: any) {
      this.cargando = false;
      this.mensajeError =
        err?.name === 'NotAllowedError'
          ? 'Se denegó el permiso de cámara. Habilítalo en la configuración del navegador e intenta de nuevo.'
          : err?.name === 'NotFoundError'
            ? 'No se encontró ninguna cámara en este dispositivo.'
            : 'No se pudo abrir la cámara. Intenta de nuevo.';
      this.cdr.detectChanges();
      this.errorCamara.emit(this.mensajeError);
    }
  }

  /** Dibuja el frame actual del video en un canvas, "quema" encima las líneas de overlayLineas
   *  (si las hay) y devuelve un JPEG en base64 (sin prefijo data:URI). */
  capturarFoto(): string | null {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (this.overlayLineas.length > 0) this.dibujarOverlay(ctx, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1] ?? null;
  }

  /** Barra semitransparente abajo + texto blanco, mismo estilo que las apps de "cámara con
   *  marca de tiempo" — el tamaño de letra se escala al ancho real de la foto (no al tamaño en
   *  pantalla) para que se vea igual de legible en un celular de pantalla chica o grande. */
  private dibujarOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const fontSize = Math.max(14, Math.round(width * 0.035));
    const lineHeight = fontSize * 1.35;
    const padding = fontSize * 0.6;
    const barHeight = this.overlayLineas.length * lineHeight + padding * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    this.overlayLineas.forEach((linea, i) => {
      ctx.fillText(linea, padding, height - barHeight + padding + i * lineHeight);
    });
  }

  detener(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
