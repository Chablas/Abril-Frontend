import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlVencimientosService } from '../../services/control-vencimientos.service';

@Component({
  selector: 'app-licencia-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, FileSelector],
  templateUrl: './licencia-add.html',
})
export class LicenciaAdd {
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  selectedFile: SelectedFile | null = null;

  fechaVencimiento = '';
  fechaRecordatorio = '';
  diasAntes: number | null = null;

  /** Correos destinatarios del recordatorio (pueden ser grupos; el backend los desglosa al enviar). */
  emails: string[] = [];
  emailInput = '';

  private readonly emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private service: ControlVencimientosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  // ── Archivo ──────────────────────────────────────────────────────────
  onFileSelected(file: SelectedFile): void {
    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  // ── Correos del recordatorio ───────────────────────────────────────────
  /** Agrega el correo escrito a la lista (Enter o botón). */
  addEmail(): void {
    const email = this.emailInput.trim();
    if (!email) return;
    if (!this.emailRegex.test(email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo inválido',
        text: `"${email}" no tiene un formato de correo válido.`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }
    if (this.emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      this.emailInput = '';
      return;
    }
    this.emails.push(email);
    this.emailInput = '';
  }

  removeEmail(index: number): void {
    this.emails.splice(index, 1);
  }

  // ── Lógica bidireccional recordatorio <-> días de antelación ───────────
  /** Suma (o resta con negativo) días a una fecha YYYY-MM-DD, sin problemas de zona horaria. */
  private addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  /** Diferencia en días entre dos fechas YYYY-MM-DD (a - b). */
  private diffDays(a: string, b: string): number {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const da = Date.UTC(ay, am - 1, ad);
    const db = Date.UTC(by, bm - 1, bd);
    return Math.round((da - db) / 86400000);
  }

  /** Al cambiar el vencimiento: reproyecta el otro campo según el que ya esté lleno. */
  onVencimientoChange(): void {
    if (!this.fechaVencimiento) return;
    if (this.diasAntes != null && this.diasAntes >= 0) {
      this.fechaRecordatorio = this.addDays(this.fechaVencimiento, -this.diasAntes);
    } else if (this.fechaRecordatorio) {
      this.syncDiasFromRecordatorio();
    }
  }

  /** Al escribir la fecha de recordatorio, autocompleta los días de antelación. */
  onRecordatorioChange(): void {
    this.syncDiasFromRecordatorio();
  }

  /** Al escribir los días de antelación, autocompleta la fecha de recordatorio. */
  onDiasChange(): void {
    if (!this.fechaVencimiento || this.diasAntes == null || this.diasAntes < 0) return;
    this.fechaRecordatorio = this.addDays(this.fechaVencimiento, -this.diasAntes);
  }

  private syncDiasFromRecordatorio(): void {
    if (!this.fechaVencimiento || !this.fechaRecordatorio) return;
    this.diasAntes = this.diffDays(this.fechaVencimiento, this.fechaRecordatorio);
  }

  // ── Validación + submit ────────────────────────────────────────────────
  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.selectedFile) errors.push('Archivo de la licencia');
    if (!this.fechaVencimiento) errors.push('Fecha de vencimiento');
    if (!this.fechaRecordatorio) errors.push('Fecha de recordatorio');
    if (this.diasAntes == null) errors.push('Días de antelación');
    if (this.emails.length === 0) errors.push('Al menos un correo para el recordatorio');
    if (this.fechaVencimiento && this.fechaRecordatorio && this.fechaRecordatorio > this.fechaVencimiento)
      errors.push('La fecha de recordatorio no puede ser posterior al vencimiento');
    if (this.diasAntes != null && this.diasAntes < 0)
      errors.push('Los días de antelación no pueden ser negativos');
    return errors;
  }

  submit(): void {
    // Si quedó un correo escrito sin agregar, se intenta agregar automáticamente.
    if (this.emailInput.trim()) this.addEmail();
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .createLicencia(
        {
          fechaVencimiento: this.fechaVencimiento,
          fechaRecordatorio: this.fechaRecordatorio,
          diasAntes: this.diasAntes!,
          emails: this.emails,
        },
        this.selectedFile!.file,
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Licencia registrada!',
            text: 'La licencia fue registrada correctamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.created.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
