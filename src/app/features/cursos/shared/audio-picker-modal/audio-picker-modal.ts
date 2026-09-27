import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type AudioPickerResultado =
  | { tipo: 'archivo'; archivo: File }
  | { tipo: 'enlace'; url: string };

/** Modal de "Reproducir audio" estilo Genially: subir archivo (drag&drop), grabar con el
 *  micrófono, o pegar un enlace externo — mismo componente para el audio de fondo de una
 *  pantalla y para el audio de una pregunta (el padre decide a qué campo va el resultado).
 *  "Locución con IA" y "Efectos de sonido" (catálogo propio de Genially) NO están incluidos:
 *  requerirían un proveedor de texto-a-voz/banco de sonidos que Abril no tiene integrado. */
@Component({
  selector: 'app-audio-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audio-picker-modal.html',
  styleUrl: './audio-picker-modal.css',
})
export class AudioPickerModal {
  @Input() abierto = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() resultado = new EventEmitter<AudioPickerResultado>();

  tab: 'subir' | 'grabar' | 'enlace' = 'subir';
  arrastrandoSobre = false;
  urlIngresada = '';

  // ---- Grabación con micrófono ----
  grabando = false;
  grabacionListaUrl: string | null = null;
  private grabacionBlob: Blob | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  errorMicrofono = '';

  cambiarTab(t: 'subir' | 'grabar' | 'enlace'): void {
    this.tab = t;
    if (t !== 'grabar') this.detenerStreamSiActivo();
  }

  cerrarModal(): void {
    this.detenerStreamSiActivo();
    this.grabando = false;
    this.grabacionListaUrl = null;
    this.grabacionBlob = null;
    this.urlIngresada = '';
    this.tab = 'subir';
    this.errorMicrofono = '';
    this.cerrar.emit();
  }

  // ---- Tab "Subir archivo" ----

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoSobre = true;
  }

  onDragLeave(): void {
    this.arrastrandoSobre = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoSobre = false;
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) this.emitirArchivo(archivo);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) this.emitirArchivo(archivo);
  }

  private emitirArchivo(archivo: File): void {
    this.resultado.emit({ tipo: 'archivo', archivo });
    this.cerrarModal();
  }

  // ---- Tab "Grabar" ----

  async iniciarGrabacion(): Promise<void> {
    this.errorMicrofono = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.errorMicrofono = 'No se pudo acceder al micrófono (permiso denegado o no disponible).';
      return;
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      this.grabacionBlob = new Blob(this.chunks, { type: 'audio/webm' });
      this.grabacionListaUrl = URL.createObjectURL(this.grabacionBlob);
      this.detenerStreamSiActivo();
    };
    this.mediaRecorder.start();
    this.grabando = true;
  }

  detenerGrabacion(): void {
    this.mediaRecorder?.stop();
    this.grabando = false;
  }

  descartarGrabacion(): void {
    if (this.grabacionListaUrl) URL.revokeObjectURL(this.grabacionListaUrl);
    this.grabacionListaUrl = null;
    this.grabacionBlob = null;
  }

  usarGrabacion(): void {
    if (!this.grabacionBlob) return;
    const archivo = new File([this.grabacionBlob], `grabacion_${Date.now()}.webm`, { type: 'audio/webm' });
    this.emitirArchivo(archivo);
  }

  private detenerStreamSiActivo(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // ---- Tab "Por enlace" ----

  usarEnlace(): void {
    const url = this.urlIngresada.trim();
    if (!url) return;
    this.resultado.emit({ tipo: 'enlace', url });
    this.cerrarModal();
  }
}
