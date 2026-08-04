import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { EmoConfiguracionService } from '../../../services/emo-configuracion.service';
import {
  EmoCorreoDestinatarioDto,
  EmoCorreoTipo,
} from '../../../dtos/emo-configuracion.model';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';

/**
 * Sección "Correos de programación de EMO" de la Configuración de EMOs.
 *
 * CRUD de los destinatarios de los correos que se envían al programar un EMO:
 * tanto la programación manual (desde /emos y desde Programaciones) como el
 * resumen del cron diario de programación automática. Dos listas: principales
 * ("Para") y copias ("CC") — no hay copias ocultas. Cada destinatario se puede
 * activar/desactivar sin borrarlo, igual que en la Configuración de Mi Salud.
 *
 * La fila "Clínica asignada" es fija (viene con `editable: false`): sus correos
 * se resuelven al enviar desde Catálogos → Clínicas, así que solo se puede
 * prender/apagar.
 */
@Component({
  selector: 'app-emo-correos-config',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './emo-correos-config.component.html',
  styleUrl: './emo-correos-config.component.css',
})
export class EmoCorreosConfigComponent implements OnInit {
  principales: EmoCorreoDestinatarioDto[] = [];
  copias: EmoCorreoDestinatarioDto[] = [];
  loading = false;

  /** id del destinatario que se está guardando (para bloquear su switch/acciones). */
  savingId: number | null = null;

  // ── Modal de alta/edición ──
  formOpen = false;
  formTipo: EmoCorreoTipo = 'PRINCIPAL';
  /** null = alta; distinto de null = edición de ese destinatario. */
  formId: number | null = null;
  formEmail = '';
  formNombre = '';
  formError: string | null = null;
  saving = false;

  constructor(
    private svc: EmoConfiguracionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getCorreos().subscribe({
      next: (res) => {
        this.principales = res.principales ?? [];
        this.copias = res.copias ?? [];
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Activar / desactivar ──
  toggle(c: EmoCorreoDestinatarioDto): void {
    if (this.savingId !== null) return;
    const nuevo = !c.active;
    this.savingId = c.id;
    this.svc.setCorreoActive(c.id, nuevo).subscribe({
      next: () => {
        c.active = nuevo;
        this.savingId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta / edición ──
  abrirAlta(tipo: EmoCorreoTipo): void {
    this.formTipo = tipo;
    this.formId = null;
    this.formEmail = '';
    this.formNombre = '';
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  abrirEdicion(c: EmoCorreoDestinatarioDto): void {
    if (!c.editable) return;
    this.formTipo = c.tipo;
    this.formId = c.id;
    this.formEmail = c.email ?? '';
    this.formNombre = c.nombre ?? '';
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  cerrarForm(): void {
    if (this.saving) return;
    this.formOpen = false;
    this.cdr.detectChanges();
  }

  get formTitulo(): string {
    const lista = this.formTipo === 'COPIA' ? 'copia' : 'destinatario principal';
    return this.formId === null ? `Agregar ${lista}` : `Editar ${lista}`;
  }

  get formValido(): boolean {
    const email = this.formEmail.trim();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  guardarForm(): void {
    if (!this.formValido || this.saving) return;
    this.saving = true;
    this.formError = null;

    const email = this.formEmail.trim();
    const nombre = this.formNombre.trim() || null;

    const request$ =
      this.formId === null
        ? this.svc.crearCorreo({ tipo: this.formTipo, email, nombre })
        : this.svc.actualizarCorreo(this.formId, { email, nombre });

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400/409 traen un mensaje útil (formato inválido, correo duplicado):
        // se muestra dentro del modal en vez de cerrarlo con un alert genérico.
        if (err.status === 400 || err.status === 409) {
          this.formError = err.error?.message ?? 'No se pudo guardar el destinatario.';
        } else {
          this.errorService.handleError(err);
        }
        this.cdr.detectChanges();
      },
    });
  }

  // ── Eliminar ──
  async eliminar(c: EmoCorreoDestinatarioDto): Promise<void> {
    if (!c.editable || this.savingId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar destinatario?',
      text: `${c.email} dejará de recibir los correos de programación de EMO.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.savingId = c.id;
    this.svc.eliminarCorreo(c.id).subscribe({
      next: () => {
        this.savingId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.savingId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Aviso: sin ningún principal activo no se envía el correo (tampoco las copias). */
  get sinPrincipalesActivos(): boolean {
    return !this.loading && !this.principales.some((c) => c.active);
  }
}
