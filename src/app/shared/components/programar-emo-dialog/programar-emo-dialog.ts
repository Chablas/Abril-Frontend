import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../search-select/search-select';
import { DatePicker } from '../date-picker/date-picker';
import { TitleCasePipe } from '../../pipes/title-case.pipe';
import { ClinicaProgramacionService } from '../../../features/clinica/services/clinica-programacion.service';
import { CatalogosSaludService } from '../../../features/ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoPorTrabajadorDto } from '../../../features/ssoma/salud-ocupacional/dtos/emo.model';
import { ProgramacionDestinatarioDto } from '../../../features/clinica/dtos/clinica.model';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  MedicoSimpleDto,
} from '../../../features/ssoma/salud-ocupacional/dtos/catalogos.model';
import { ErrorService } from '../../../core/services/error.service';

/**
 * "Programar EMO con clínica": reserva la cita en una clínica (crea una `ss_programacion_emo`) y
 * dispara el correo de programación. NO registra el resultado del examen: eso es el modal
 * "Registrar resultados de EMO" (`emos/components/emo-create`), que crea la fila de `worker_emos`
 * con aptitud y vencimiento.
 *
 * Lo usan la pantalla de EMOs de SSOMA y la del portal de la clínica, así que vive en
 * `shared/components/`. Sigue el estándar de formularios SSOMA: `app-abril-modal-panel` en
 * variante azul, `app-search-select` / `app-date-picker` para los desplegables y la fecha, y las
 * clases globales `.abril-field*` para los campos nativos.
 */
@Component({
  selector: 'app-programar-emo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect, DatePicker, TitleCasePipe],
  templateUrl: './programar-emo-dialog.html',
  styleUrl: './programar-emo-dialog.css',
})
export class ProgramarEmoDialogComponent implements OnInit {
  @Input() worker!: EmoPorTrabajadorDto;
  @Output() closed = new EventEmitter<boolean>();

  /** Acento azul del logo: el de los formularios SSOMA (ver CLAUDE.md → estándar de UI). */
  readonly accentColor = 'var(--color-abril-logo-blue)';

  tiposEmo: EmoTipoDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];

  form: {
    fechaProgramada: string;
    tipoEmoId: number | null;
    clinicaId: number | null;
    medicoId: number | null;
    notas: string;
  } = {
    fechaProgramada: '',
    tipoEmoId: null,
    clinicaId: null,
    medicoId: null,
    notas: '',
  };

  submitting = false;

  /**
   * A quién le va a llegar el correo de la cita, resuelto por el backend con la misma lógica del
   * envío real. Se recarga al cambiar de clínica porque sus correos de contacto forman parte.
   */
  destinatarios: ProgramacionDestinatarioDto[] = [];
  copias: ProgramacionDestinatarioDto[] = [];
  cargandoDestinatarios = false;

  constructor(
    private programacionService: ClinicaProgramacionService,
    private catalogos: CatalogosSaludService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalogos.getEmoTipos().subscribe({
      next: (list) => {
        this.tiposEmo = list;
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getClinicas().subscribe({
      next: (list) => {
        this.clinicas = list.filter((c) => c.activo);
        this.cdr.detectChanges();
      },
    });
    this.catalogos.getMedicos().subscribe({
      next: (list) => {
        this.medicos = list.filter((m) => m.activo);
        this.cdr.detectChanges();
      },
    });
    this.cargarDestinatarios();
  }

  private cargarDestinatarios(): void {
    this.cargandoDestinatarios = true;
    this.programacionService
      .getDestinatarios(this.worker.workerId, this.form.clinicaId)
      .subscribe({
        next: (res) => {
          this.destinatarios = res?.para ?? [];
          this.copias = res?.copias ?? [];
          this.cargandoDestinatarios = false;
          this.cdr.detectChanges();
        },
        // Es solo informativo: si falla, el formulario sigue siendo usable sin el aviso.
        error: () => {
          this.destinatarios = [];
          this.copias = [];
          this.cargandoDestinatarios = false;
          this.cdr.detectChanges();
        },
      });
  }

  /** Etiqueta del destinatario: "Clínica ServiSalud", "Jefe Juan Pérez" o el correo a secas. */
  etiquetaDestinatario(d: ProgramacionDestinatarioDto): string {
    if (!d.nombre) return d.email;
    const prefijo = d.origen === 'CLINICA' ? 'Clínica' : d.origen === 'JEFE' ? 'Jefe' : '';
    return prefijo ? `${prefijo} ${d.nombre}` : d.nombre;
  }

  /**
   * Médicos de la clínica elegida (los que no tienen clínica asignada valen para cualquiera),
   * igual que en el modal de Nuevo EMO: evita ofrecer médicos de otra clínica.
   */
  get medicosFiltrados(): MedicoSimpleDto[] {
    if (!this.form.clinicaId) return this.medicos;
    return this.medicos.filter((m) => !m.clinicaId || m.clinicaId === this.form.clinicaId);
  }

  /** Al cambiar de clínica se descarta el médico elegido si pertenecía a otra. */
  onClinicaChange(id: number | null): void {
    this.form.clinicaId = id;
    if (id && this.form.medicoId) {
      const medico = this.medicos.find((m) => m.id === this.form.medicoId);
      if (medico?.clinicaId && medico.clinicaId !== id) this.form.medicoId = null;
    }
    // Los correos de contacto son de la clínica, así que el aviso cambia con ella.
    this.cargarDestinatarios();
  }

  get canSubmit(): boolean {
    return !!(this.form.fechaProgramada && this.form.tipoEmoId && this.form.clinicaId);
  }

  submit(): void {
    if (!this.canSubmit || this.submitting) return;

    this.submitting = true;
    this.programacionService
      .programarEmo({
        workerId: this.worker.workerId,
        tipoEmoId: this.form.tipoEmoId!,
        empresaId: this.worker.empresaId ?? null,
        fechaProgramada: this.form.fechaProgramada,
        horaProgramada: null,
        clinicaId: this.form.clinicaId,
        medicoId: this.form.medicoId,
        notas: this.form.notas || null,
        origen: 'Registro directo',
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          Swal.fire({
            icon: 'success',
            title: 'EMO programado',
            text: 'El EMO fue programado correctamente.',
            timer: 2000,
            showConfirmButton: false,
          });
          this.closed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  close(): void {
    this.closed.emit(false);
  }
}
