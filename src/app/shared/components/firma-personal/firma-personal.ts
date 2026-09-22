import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { SignaturePad } from '../signature-pad/signature-pad';
import { FileSelector, SelectedFile } from '../file-selector/file-selector';
import { SectionTab, SectionTabs } from '../section-tabs/section-tabs';
import { FirmaPersonalService } from '../../../core/firma/firma-personal.service';
import {
  FirmaPersonalDto,
  FirmaPersonalEstadoDto,
  FirmaTipoCodigo,
} from '../../../core/firma/firma-personal.dto';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

/**
 * Panel para registrar la firma del usuario logueado: muestra las que tiene hoy (si tiene) y la
 * forma de registrar una nueva — un lienzo para dibujarla con el mouse, un selector para subirla
 * como imagen, o los dos.
 *
 * Una persona tiene una firma POR TIPO (`person_firma`), así que este panel es el mismo en las dos
 * pantallas que lo ofrecen —Mi Perfil → Mi Firma y Contabilidad → Firma— y también dentro del
 * modal que salta al aprobar un consolidado sin tener firma. Antes cada pantalla tenía su copia; si
 * el lienzo o las validaciones se separaban, la misma ficha quedaba con firmas distintas según por
 * dónde se registró.
 */
@Component({
  selector: 'app-firma-personal',
  standalone: true,
  imports: [CommonModule, SignaturePad, FileSelector, SectionTabs],
  templateUrl: './firma-personal.html',
})
export class FirmaPersonal implements OnInit {
  @ViewChild('pad') pad?: SignaturePad;

  /** Texto de la fila de estado. Cada pantalla lo ajusta a lo que se firma ahí. */
  @Input() descripcion = 'Firma que se estampa en los documentos que firmes';

  /**
   * Qué formas de registrar la firma ofrece esta pantalla.
   *
   * Por defecto solo el dibujo, que es lo único que existía y lo que sigue mostrando Contabilidad
   * → Firma. `null` deja que mande la configuración de Consolidados → Configuración → Firmas: lo
   * usan Mi Perfil → Mi Firma y el modal que salta al aprobar un consolidado sin firma.
   */
  @Input() tipos: FirmaTipoCodigo[] | null = ['DIBUJO'];

  /** Emite la firma recién guardada (la usa el modal para continuar con la acción pendiente). */
  @Output() guardada = new EventEmitter<FirmaPersonalDto>();

  estado: FirmaPersonalEstadoDto | null = null;

  /** Tipo que el usuario está registrando ahora mismo. */
  modo: FirmaTipoCodigo = 'DIBUJO';

  /** Hay algo dibujado en el lienzo (habilita el botón de guardar en modo DIBUJO). */
  hasDrawing = false;

  /** Imagen elegida y todavía no guardada: data URL para la vista previa y para el envío. */
  imagenElegida: string | null = null;
  imagenNombre: string | null = null;

  /** Tope de lo que se acepta subir. El backend valida lo mismo. */
  private static readonly MAX_BYTES_IMAGEN = 12 * 1024 * 1024;

  private static readonly ETIQUETAS: Record<FirmaTipoCodigo, string> = {
    IMAGEN: 'Subir imagen',
    DIBUJO: 'Dibujar con el mouse',
  };

  constructor(
    private service: FirmaPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Lo que la pantalla ya fijó se aplica antes de pedir nada: si el GET falla, igual queda un
    // formulario usable en vez de una tarjeta vacía. Cuando manda la configuración (`tipos = null`)
    // no hay nada que aplicar todavía — ahí sí hay que esperar la respuesta para saber qué ofrecer.
    this.aplicarTiposOfrecidos(this.tipos ?? []);
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.get().subscribe({
      next: (res) => {
        this.aplicar(res);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private aplicar(estado: FirmaPersonalEstadoDto): void {
    this.estado = estado;
    this.aplicarTiposOfrecidos(
      this.tipos ?? estado.tipos.filter((t) => t.activo).map((t) => t.codigo),
    );
  }

  /**
   * Fija qué se ofrece y con qué pestañas.
   *
   * Se guarda en campos y no se calcula en un getter porque `[tabs]` recibiría un array nuevo en
   * cada ciclo de detección, y `app-section-tabs` volvería a medirse para siempre por un
   * `ngOnChanges` que nunca deja de dispararse.
   */
  private aplicarTiposOfrecidos(tipos: FirmaTipoCodigo[]): void {
    this.tiposOfrecidos = [...tipos];

    this.modoTabs = this.tiposOfrecidos.map((codigo) => ({
      id: codigo,
      label: FirmaPersonal.ETIQUETAS[codigo],
    }));

    // El modo activo tiene que seguir siendo uno de los ofrecidos: si la configuración cambió
    // entre que se abrió la pantalla y ahora, quedaría un formulario que el backend rechaza.
    if (!this.tiposOfrecidos.includes(this.modo)) {
      this.modo = this.tiposOfrecidos[0] ?? 'DIBUJO';
    }
  }

  // ── Qué se ofrece ───────────────────────────────────────────────────────

  /**
   * Los tipos que esta pantalla deja registrar: los que le pasaron por `[tipos]`, o los que estén
   * habilitados en la configuración cuando se le pasó `null`. Vacío hasta que responde el backend,
   * que es lo que mantiene el formulario oculto mientras no se sabe qué ofrecer.
   */
  tiposOfrecidos: FirmaTipoCodigo[] = [];

  /** Pestañas para elegir cómo registrar. Solo se dibujan cuando hay más de una forma. */
  modoTabs: SectionTab[] = [];

  onModoChange(id: string): void {
    this.modo = id as FirmaTipoCodigo;
    // Lo empezado en el otro modo se descarta: guardar manda UNA firma, y arrastrar un trazo a
    // medias hasta la pestaña de imagen solo confunde sobre qué se va a guardar.
    this.limpiar();
  }

  // ── Lo que ya está registrado ───────────────────────────────────────────

  get firmas(): FirmaPersonalDto[] {
    return this.estado?.firmas ?? [];
  }

  /** Tiene alguna firma registrada, del tipo que sea. Es lo que dice el badge. */
  get registrada(): boolean {
    return this.firmas.length > 0;
  }

  /**
   * Tiene firma, pero ninguna de las que esta pantalla pide. Es exactamente el caso que hace saltar
   * el modal al aprobar un consolidado: el badge dice REGISTRADA —y es verdad— pero igual hay que
   * registrar la otra, así que el motivo se dice en vez de dejarlo en contradicción aparente.
   */
  get faltaLaQueSePide(): boolean {
    const ofrecidos = this.tiposOfrecidos;
    return this.firmas.length > 0 && !this.firmas.some((f) => ofrecidos.includes(f.tipo));
  }

  /** Cómo se llama lo que falta, para el aviso ("subirla como imagen" / "dibujarla"). */
  get loQueSePide(): string {
    const ofrecidos = this.tiposOfrecidos;
    if (ofrecidos.length !== 1) return 'otra forma de firma';
    return ofrecidos[0] === 'IMAGEN' ? 'una imagen con tu firma' : 'la firma dibujada con el mouse';
  }

  etiqueta(tipo: FirmaTipoCodigo): string {
    return FirmaPersonal.ETIQUETAS[tipo] ?? tipo;
  }

  /** La firma ya registrada de ese tipo, si existe (para avisar que guardar la reemplaza). */
  firmaDe(tipo: FirmaTipoCodigo): FirmaPersonalDto | null {
    return this.firmas.find((f) => f.tipo === tipo) ?? null;
  }

  // ── Registrar ───────────────────────────────────────────────────────────

  onImagenSeleccionada(seleccion: SelectedFile): void {
    const archivo = seleccion.file;

    if (!/^image\/(png|jpe?g|webp)$/i.test(archivo.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no admitido',
        text: 'La firma tiene que ser una imagen PNG, JPG o WEBP.',
      });
      return;
    }

    if (archivo.size > FirmaPersonal.MAX_BYTES_IMAGEN) {
      Swal.fire({
        icon: 'warning',
        title: 'Imagen demasiado pesada',
        text: 'El archivo no puede pasar de 12 MB.',
      });
      return;
    }

    // Se lee como data URL y no se manda el File: el endpoint recibe el mismo base64 que manda el
    // lienzo, así una sola forma de guardar cubre las dos.
    const reader = new FileReader();
    reader.onload = () => {
      this.imagenElegida = typeof reader.result === 'string' ? reader.result : null;
      this.imagenNombre = archivo.name;
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo leer el archivo',
        text: 'Vuelve a elegir la imagen.',
      });
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.imagenElegida = null;
    this.imagenNombre = null;
  }

  limpiar(): void {
    this.pad?.clear();
    this.quitarImagen();
  }

  /** Hay algo listo para mandar en el modo activo. */
  get puedeGuardar(): boolean {
    return this.modo === 'IMAGEN' ? this.imagenElegida != null : this.hasDrawing;
  }

  guardar(): void {
    const dataUrl = this.modo === 'IMAGEN' ? this.imagenElegida : this.pad?.toDataUrl();

    if (!dataUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Firma vacía',
        text:
          this.modo === 'IMAGEN'
            ? 'Sube la imagen de tu firma antes de guardar.'
            : 'Dibuja la firma antes de guardar.',
      });
      return;
    }

    const tipo = this.modo;

    this.loaderService.show();
    this.service.save(tipo, dataUrl).subscribe({
      next: (res) => {
        this.aplicar(res);
        this.limpiar();
        this.loaderService.hide();
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Firma guardada',
          timer: 1500,
          showConfirmButton: false,
        });

        const guardada = res.firmas.find((f) => f.tipo === tipo);
        if (guardada) this.guardada.emit(guardada);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
