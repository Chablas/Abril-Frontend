import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { CorreoDestinatariosService, CorreoTipo } from '../services/correo-destinatarios.service';

/**
 * Configuración de los destinatarios de un correo de Reclutamiento. Dos listas de correos:
 * principales (Para) y copias (CC). Reutilizable por tipo de correo:
 *   - `solicitud` → correo de nueva solicitud de personal (va a GTH).
 *   - `long-list` → correo de long list enviada (va al solicitante).
 * Permite cambiar fácilmente entre un correo de pruebas y el de producción sin redeploy.
 */
@Component({
  standalone: true,
  selector: 'app-gth-configuracion-correos',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './configuracion-correos.html',
})
export class GthConfiguracionCorreos implements OnInit {
  /** Qué correo se está configurando. */
  @Input({ required: true }) tipo!: CorreoTipo;
  /** Título del modal. */
  @Input() titulo = 'CONFIGURACIÓN DEL CORREO';
  /** Texto introductorio que explica a quién se envía el correo. */
  @Input() intro = '';
  /**
   * Si es true, los destinatarios principales (Para) son OPCIONALES: el destinatario principal
   * ya lo pone el backend automáticamente (ej. long-list → siempre el solicitante) y esta lista
   * solo agrega principales extra. Con false (default) se exige al menos un principal.
   */
  @Input() principalOpcional = false;

  @Output() closeModal = new EventEmitter<void>();

  principales: string[] = [];
  copias: string[] = [];

  nuevoPrincipal = '';
  nuevoCopia = '';

  private static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private service: CorreoDestinatariosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.get(this.tipo).subscribe({
      next: (data) => {
        this.principales = data.principales ?? [];
        this.copias = data.copias ?? [];
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
    if (!this.principalOpcional && this.principales.length === 0) {
      Swal.fire({
        title: 'Falta un destinatario principal',
        text: 'Agrega al menos un correo principal (Para) para que se envíe la notificación.',
        icon: 'warning',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    this.loaderService.show();
    this.service.save(this.tipo, { principales: this.principales, copias: this.copias }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
