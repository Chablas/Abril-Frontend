import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import {
  SectionTab,
  SectionTabs,
} from '../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ErrorService } from '../../../../../core/services/error.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { CorreoConfigService } from '../services/correo-config.service';
import {
  CorreoConfigEvento,
  CorreoDestinatarioFila,
} from '../dtos/correo-config.dto';

/**
 * Configuración de los correos de Solicitud de Personal.
 *
 * Una sección (`app-section-tabs`) por cada correo del flujo: aprobación de Gerencia General,
 * nueva solicitud a GTH, decisión de long list y decisión de finalista. Cada sección tiene un
 * interruptor maestro (apagado = ese correo no se envía) y la lista de sus destinatarios, cada
 * uno con su propio interruptor.
 *
 * Hay dos clases de destinatario:
 *  • Dinámicos (Gerente General, gerente del área del solicitante, área de GTH): su correo NO se
 *    escribe acá, sale del dato maestro al momento de enviar. Solo se prenden y apagan.
 *  • Correos adicionales: alta, edición y baja completa desde la pantalla.
 */
@Component({
  standalone: true,
  selector: 'app-gth-correos-config',
  imports: [CommonModule, FormsModule, AbrilModalPanel, SectionTabs, SearchSelect],
  templateUrl: './correos-config.html',
  styleUrl: './correos-config.css',
})
export class GthCorreosConfig implements OnInit {
  eventos: CorreoConfigEvento[] = [];
  loading = false;

  /** Código del correo cuya sección se está viendo. */
  eventoActivoCodigo: string | null = null;

  /** id del destinatario que se está guardando/eliminando, para bloquear su fila. */
  savingDestinatarioId: number | null = null;
  /** Código del correo cuyo interruptor maestro se está guardando. */
  savingEventoCodigo: string | null = null;

  // ── Modal de alta/edición de un correo adicional ──
  formOpen = false;
  /** null = alta; distinto de null = edición. */
  formId: number | null = null;
  formEmail = '';
  formNombre = '';
  formEsCopia = false;
  formError: string | null = null;
  saving = false;

  /** Opciones de "Recibe como". Orden deliberado (Para antes que CC) → `sortAlpha` en false. */
  readonly tipoOptions: { id: 'PARA' | 'CC'; label: string }[] = [
    { id: 'PARA', label: 'Destinatario (Para)' },
    { id: 'CC', label: 'Copia (CC)' },
  ];

  private static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private svc: CorreoConfigService,
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
        this.eventos = res.eventos ?? [];
        if (!this.eventos.some((e) => e.codigo === this.eventoActivoCodigo))
          this.eventoActivoCodigo = this.eventos[0]?.codigo ?? null;
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

  // ── Secciones ──
  get sectionTabs(): SectionTab[] {
    return this.eventos.map((e) => ({
      id: e.codigo,
      label: e.nombre,
      badge: e.active ? this.destinatariosActivos(e) : 'Off',
    }));
  }

  get eventoActivo(): CorreoConfigEvento | null {
    return this.eventos.find((e) => e.codigo === this.eventoActivoCodigo) ?? null;
  }

  onSectionChange(codigo: string): void {
    this.eventoActivoCodigo = codigo;
    this.cdr.detectChanges();
  }

  /** Cuántos destinatarios reciben ese correo hoy. */
  private destinatariosActivos(evento: CorreoConfigEvento): number {
    return evento.destinatarios.filter((d) => d.active).length;
  }

  /** Destinatarios principales activos: sin al menos uno, el correo no le llega a nadie. */
  private principalesActivos(evento: CorreoConfigEvento): number {
    return evento.destinatarios.filter((d) => d.active && !d.esCopia).length;
  }

  /** El correo está prendido pero no tiene a quién mandárselo. */
  get sinPrincipales(): boolean {
    const e = this.eventoActivo;
    return !this.loading && !!e && e.active && this.principalesActivos(e) === 0;
  }

  /** Filas activas que hoy no resuelven a ningún correo: no le llega nada a nadie por ellas. */
  get filasSinCorreo(): CorreoDestinatarioFila[] {
    return (this.eventoActivo?.destinatarios ?? []).filter((d) => d.active && d.sinCorreo);
  }

  // ── Interruptor maestro del correo ──
  toggleEvento(evento: CorreoConfigEvento): void {
    if (this.savingEventoCodigo !== null) return;

    const nuevo = !evento.active;
    this.savingEventoCodigo = evento.codigo;
    // Optimista: se pinta al toque y se revierte si el guardado falla.
    evento.active = nuevo;

    this.svc.setCorreoActive(evento.codigo, nuevo).subscribe({
      next: () => {
        this.savingEventoCodigo = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        evento.active = !nuevo;
        this.savingEventoCodigo = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Interruptor de un destinatario ──
  toggleDestinatario(fila: CorreoDestinatarioFila): void {
    if (this.savingDestinatarioId !== null) return;

    const nuevo = !fila.active;
    this.savingDestinatarioId = fila.destinatarioId;
    fila.active = nuevo;

    this.svc.setDestinatarioActive(fila.destinatarioId, nuevo).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        fila.active = !nuevo;
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta / edición de un correo adicional ──
  abrirAlta(): void {
    this.formId = null;
    this.formEmail = '';
    this.formNombre = '';
    this.formEsCopia = false;
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  abrirEdicion(fila: CorreoDestinatarioFila): void {
    if (!fila.editable) return;
    this.formId = fila.destinatarioId;
    this.formEmail = fila.email ?? '';
    this.formNombre = fila.nombre ?? '';
    this.formEsCopia = fila.esCopia;
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
    return this.formId === null ? 'Agregar correo adicional' : 'Editar correo adicional';
  }

  get formTipo(): 'PARA' | 'CC' {
    return this.formEsCopia ? 'CC' : 'PARA';
  }

  onFormTipoChange(valor: 'PARA' | 'CC'): void {
    this.formEsCopia = valor === 'CC';
  }

  get formValido(): boolean {
    return GthCorreosConfig.EMAIL_RE.test(this.formEmail.trim());
  }

  guardarForm(): void {
    if (!this.formValido || this.saving) return;
    this.saving = true;
    this.formError = null;

    const email = this.formEmail.trim().toLowerCase();
    const nombre = this.formNombre.trim() || null;

    const request$ =
      this.formId === null
        ? this.svc.crearAdicional({
            eventoCodigo: this.eventoActivoCodigo ?? '',
            email,
            nombre,
            esCopia: this.formEsCopia,
          })
        : this.svc.actualizarAdicional(this.formId, {
            email,
            nombre,
            esCopia: this.formEsCopia,
          });

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400/409 traen un mensaje útil (formato inválido, correo duplicado): se muestra
        // dentro del modal en vez de cerrarlo con un alert genérico.
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
  async eliminar(fila: CorreoDestinatarioFila): Promise<void> {
    if (!fila.eliminable || this.savingDestinatarioId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar destinatario?',
      text: `${fila.email} dejará de recibir «${this.eventoActivo?.nombre}».`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.savingDestinatarioId = fila.destinatarioId;
    this.svc.eliminarAdicional(fila.destinatarioId).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  trackFila(_: number, f: CorreoDestinatarioFila): number {
    return f.destinatarioId;
  }
}
