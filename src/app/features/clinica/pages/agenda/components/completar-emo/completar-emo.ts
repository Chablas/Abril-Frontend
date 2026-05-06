import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { EmoService } from '../../../../../ssoma/salud-ocupacional/services/emo.service';
import { EmoCreateDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
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
  saving = false;

  readonly aptitudes = ['Apto', 'Apto con Restricciones', 'No Apto', 'Observado'];

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
    this.saving = false;
  }

  get canSubmit(): boolean {
    return !!this.aptitud && !!this.programacion && !this.saving;
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit || !this.programacion) return;
    this.saving = true;
    this.loaderService.show();

    const emoDto: EmoCreateDto = {
      workerId: this.programacion.workerId,
      tipoEmoId: this.programacion.tipoEmoId ?? 0,
      empresaOrigenId: this.programacion.empresaId ?? 0,
      fechaEmo: new Date().toISOString().split('T')[0],
      aptitud: this.aptitud,
      requiereInterconsulta: this.aptitud === 'Observado',
      numeroInforme: this.numeroInforme || undefined,
      urlResultado: this.urlResultado || undefined,
      notas: this.notas || undefined,
      examenes: [],
      restricciones: [],
    };

    this.emoSvc.createEmo(emoDto).subscribe({
      next: (res) => {
        this.progSvc
          .accionClinica(this.programacion!.id, {
            id: this.programacion!.id,
            accion: 'Completar',
            emoResultadoId: res.id,
          })
          .subscribe({
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
