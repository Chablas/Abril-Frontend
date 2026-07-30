import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import {
  CorreoDestinatarios,
  CorreoDestinatariosService,
  CorreoTipo,
} from '../services/correo-destinatarios.service';

/** Una opción del selector cuando el modal configura varios correos independientes. */
export interface ConfigCorreoOpcion {
  tipo: CorreoTipo;
  /** Texto del botón del selector segmentado. */
  label: string;
  /** Texto introductorio que explica a quién se envía ese correo. */
  intro: string;
  /** Si los destinatarios principales son opcionales (el backend ya pone uno automáticamente). */
  principalOpcional?: boolean;
}

/**
 * Configuración de los destinatarios de correos de Reclutamiento. Dos listas por correo:
 * principales (Para) y copias (CC). Cada correo es INDEPENDIENTE (no comparte destinatarios).
 *
 * Dos modos de uso:
 *   - Un solo correo: pasar `tipo` (+ `titulo`/`intro`). Usado por Reclutamiento (long-list).
 *   - Varios correos: pasar `opciones` (array). Muestra un selector segmentado para alternar
 *     entre correos; cada uno mantiene y guarda sus propios destinatarios. Usado por Solicitud
 *     de Personal (correo de nueva solicitud + correo de decisión de long list).
 */
@Component({
  standalone: true,
  selector: 'app-gth-configuracion-correos',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './configuracion-correos.html',
})
export class GthConfiguracionCorreos implements OnInit {
  /** Modo un solo correo: qué correo se configura. Ignorado si se pasa `opciones`. */
  @Input() tipo?: CorreoTipo;
  /** Modo varios correos: lista de correos independientes a configurar. */
  @Input() opciones?: ConfigCorreoOpcion[];

  /** Título del modal. */
  @Input() titulo = 'CONFIGURACIÓN DEL CORREO';
  /** Texto introductorio (modo un solo correo). En modo varios, cada opción trae el suyo. */
  @Input() intro = '';
  /** Principales opcionales (modo un solo correo). En modo varios, cada opción lo define. */
  @Input() principalOpcional = false;

  @Output() closeModal = new EventEmitter<void>();

  /** Opción activa (modo varios correos). */
  activa: ConfigCorreoOpcion | null = null;

  principales: string[] = [];
  copias: string[] = [];

  nuevoPrincipal = '';
  nuevoCopia = '';

  /** Caché de destinatarios por tipo, para no re-pedir al alternar entre correos. */
  private cache = new Map<CorreoTipo, CorreoDestinatarios>();

  private static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private service: CorreoDestinatariosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get modoMultiple(): boolean {
    return !!this.opciones && this.opciones.length > 0;
  }

  /** Tipo del correo que se está configurando ahora. */
  get tipoActivo(): CorreoTipo {
    return this.modoMultiple ? this.activa!.tipo : this.tipo!;
  }

  /** Texto introductorio del correo activo. */
  get introActivo(): string {
    return this.modoMultiple ? this.activa!.intro : this.intro;
  }

  /** ¿El principal es opcional para el correo activo? */
  get principalOpcionalActivo(): boolean {
    return this.modoMultiple ? !!this.activa!.principalOpcional : this.principalOpcional;
  }

  ngOnInit(): void {
    if (this.modoMultiple) {
      this.activa = this.opciones![0];
      this.cargar(this.activa.tipo);
    } else {
      this.cargar(this.tipo!);
    }
  }

  /** Cambia el correo que se está configurando (modo varios correos). */
  cambiarTipo(op: ConfigCorreoOpcion): void {
    if (this.activa?.tipo === op.tipo) return;
    // Preserva lo editado del correo actual en la caché antes de cambiar.
    if (this.activa)
      this.cache.set(this.activa.tipo, { principales: this.principales, copias: this.copias });
    this.activa = op;

    const cached = this.cache.get(op.tipo);
    if (cached) {
      this.principales = cached.principales;
      this.copias = cached.copias;
    } else {
      this.cargar(op.tipo);
    }
    this.nuevoPrincipal = '';
    this.nuevoCopia = '';
  }

  private cargar(tipo: CorreoTipo): void {
    this.loaderService.show();
    this.service.get(tipo).subscribe({
      next: (data) => {
        this.principales = data.principales ?? [];
        this.copias = data.copias ?? [];
        this.cache.set(tipo, { principales: this.principales, copias: this.copias });
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Agregar / quitar correos ───────────────────────────────────────────
  agregarPrincipal(): void {
    const email = this.normalizar(this.nuevoPrincipal);
    if (!this.validar(email)) return;
    if (this.copias.includes(email)) this.copias = this.copias.filter((e) => e !== email);
    if (!this.principales.includes(email)) this.principales.push(email);
    this.nuevoPrincipal = '';
  }

  agregarCopia(): void {
    const email = this.normalizar(this.nuevoCopia);
    if (!this.validar(email)) return;
    if (this.principales.includes(email)) {
      Swal.fire({
        title: 'Correo ya es principal',
        text: `«${email}» ya está en los destinatarios principales.`,
        icon: 'info',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      this.nuevoCopia = '';
      return;
    }
    if (!this.copias.includes(email)) this.copias.push(email);
    this.nuevoCopia = '';
  }

  quitarPrincipal(email: string): void {
    this.principales = this.principales.filter((e) => e !== email);
  }

  quitarCopia(email: string): void {
    this.copias = this.copias.filter((e) => e !== email);
  }

  private normalizar(raw: string): string {
    return (raw ?? '').trim().toLowerCase();
  }

  private validar(email: string): boolean {
    if (!email) return false;
    if (!GthConfiguracionCorreos.EMAIL_RE.test(email)) {
      Swal.fire({
        title: 'Correo no válido',
        text: `«${email}» no tiene un formato de correo válido.`,
        icon: 'warning',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return false;
    }
    return true;
  }

  // ── Guardar ─────────────────────────────────────────────────────────────
  guardar(): void {
    if (!this.principalOpcionalActivo && this.principales.length === 0) {
      Swal.fire({
        title: 'Falta un destinatario principal',
        text: 'Agrega al menos un correo principal (Para) para que se envíe la notificación.',
        icon: 'warning',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    const tipo = this.tipoActivo;
    this.loaderService.show();
    this.service.save(tipo, { principales: this.principales, copias: this.copias }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        // Refresca la caché del tipo guardado con lo persistido.
        this.cache.set(tipo, { principales: this.principales, copias: this.copias });

        if (this.modoMultiple) {
          // No cerramos: permite guardar también el otro correo desde el mismo modal.
          Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
          this.closeModal.emit();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
