import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { EmoService } from '../../../../../ssoma/salud-ocupacional/services/emo.service';
import { EmoCreateDto, InterconsultaInlineCreateDto, EmoRestriccionCreateDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
import { ClinicaProgramacionService } from '../../../../services/clinica-programacion.service';
import { ProgramacionClinicaDto } from '../../../../dtos/clinica.model';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';

@Component({
  selector: 'app-completar-emo',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './completar-emo.html',
  styleUrls: ['./completar-emo.css'],
})
export class CompletarEmo implements OnChanges {
  @Input() open = false;
  @Input() programacion: ProgramacionClinicaDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() completado = new EventEmitter<void>();

  aptitud = '';
  numeroInforme = '';
  urlResultado = '';
  notas = '';
  fechaLectura = '';
  saving = false;

  // Restricciones
  restricciones: { descripcionLibre: string }[] = [];
  nuevaRestriccion = '';

  // Interconsulta inline
  icEspecialidad = '';
  icCentro = '';
  icDiagnostico = '';
  icCie10 = '';
  icRequiereSeguimiento = false;

  readonly aptitudes = ['Apto', 'Apto con Restricciones', 'No Apto', 'Observado'];

  get requiereRestriccion(): boolean {
    return this.aptitud === 'Apto con Restricciones';
  }

  get requiereInterconsulta(): boolean {
    return this.aptitud === 'No Apto' || this.aptitud === 'Observado';
  }

  constructor(
    private emoSvc: EmoService,
    private progSvc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.reset();
  }

  reset(): void {
    this.aptitud = '';
    this.numeroInforme = '';
    this.urlResultado = '';
    this.notas = '';
    this.fechaLectura = '';
    this.restricciones = [];
    this.nuevaRestriccion = '';
    this.icEspecialidad = '';
    this.icCentro = '';
    this.icDiagnostico = '';
    this.icCie10 = '';
    this.icRequiereSeguimiento = false;
    this.saving = false;
  }

  agregarRestriccion(): void {
    const txt = this.nuevaRestriccion.trim();
    if (!txt) return;
    this.restricciones.push({ descripcionLibre: txt });
    this.nuevaRestriccion = '';
  }

  quitarRestriccion(i: number): void {
    this.restricciones.splice(i, 1);
  }

  get canSubmit(): boolean {
    if (!this.aptitud || !this.programacion || this.saving) return false;
    if (this.requiereInterconsulta && !this.icEspecialidad.trim()) return false;
    return true;
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit || !this.programacion) return;
    this.saving = true;
    this.loaderService.show();

    const restriccionesPayload: EmoRestriccionCreateDto[] = this.restricciones.map(r => ({
      descripcionLibre: r.descripcionLibre,
      vigente: true,
    }));

    let interconsultaInline: InterconsultaInlineCreateDto | undefined;
    if (this.requiereInterconsulta) {
      interconsultaInline = {
        especialidad: this.icEspecialidad.trim(),
        centroAtencion: this.icCentro.trim() || undefined,
        diagnostico: this.icDiagnostico.trim() || undefined,
        cie10: this.icCie10.trim() || undefined,
        requiereSeguimiento: this.icRequiereSeguimiento,
      };
    }

    const emoDto: EmoCreateDto = {
      workerId: this.programacion.workerId,
      tipoEmoId: this.programacion.tipoEmoId ?? 0,
      empresaOrigenId: this.programacion.empresaId ?? 0,
      fechaEmo: new Date().toISOString().split('T')[0],
      aptitud: this.aptitud,
      requiereInterconsulta: this.requiereInterconsulta,
      numeroInforme: this.numeroInforme || undefined,
      urlResultado: this.urlResultado || undefined,
      notas: this.notas || undefined,
      fechaLectura: this.fechaLectura || undefined,
      examenes: [],
      restricciones: restriccionesPayload,
      interconsultaInline,
    };

    this.emoSvc.createEmo(emoDto).subscribe({
      next: (res) => {
        this.progSvc.accionClinica(this.programacion!.id, {
          id: this.programacion!.id,
          accion: 'Completar',
          emoResultadoId: res.id,
        }).subscribe({
          next: () => {
            this.saving = false;
            this.loaderService.hide();
            this.completado.emit();
          },
          error: (err) => {
            this.saving = false;
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
