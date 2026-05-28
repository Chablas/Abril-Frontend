import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { EmoService } from '../../../../../ssoma/salud-ocupacional/services/emo.service';
import { EmoCreateDto, InterconsultaInlineCreateDto, EmoRestriccionCreateDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from '../../../../../ssoma/salud-ocupacional/services/http-base';
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
  @Input() interconsultaId?: number;
  @Output() closed = new EventEmitter<void>();
  @Output() completado = new EventEmitter<void>();

  aptitud = '';
  notas = '';
  lecturaRealizada = false;
  fechaLectura = '';
  saving = false;

  archivoAptitud: File | null = null;
  archivoEmo: File | null = null;
  documentoInterconsulta: File | null = null;

  restricciones: { descripcionLibre: string }[] = [];
  nuevaRestriccion = '';

  icEspecialidad = '';
  icDiagnostico = '';
  icRequiereSeguimiento = false;

  readonly aptitudes = ['Apto', 'Apto con Restricciones', 'No Apto', 'Observado'];

  get requiereRestriccion(): boolean { return this.aptitud === 'Apto con Restricciones'; }
  get requiereDocumentos(): boolean { return this.aptitud === 'Apto' || this.aptitud === 'Apto con Restricciones'; }
  get requiereInterconsulta(): boolean { return this.aptitud === 'No Apto' || this.aptitud === 'Observado'; }

  get canSubmit(): boolean {
    if (!this.aptitud || !this.programacion || this.saving) return false;
    if (this.requiereDocumentos && (!this.archivoAptitud || !this.archivoEmo)) return false;
    if (this.requiereRestriccion && this.restricciones.length === 0) return false;
    if (this.requiereInterconsulta && !this.icEspecialidad.trim()) return false;
    return true;
  }

  constructor(
    private http: HttpClient,
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
    this.notas = '';
    this.lecturaRealizada = false;
    this.fechaLectura = '';
    this.restricciones = [];
    this.nuevaRestriccion = '';
    this.icEspecialidad = '';
    this.icDiagnostico = '';
    this.icRequiereSeguimiento = false;
    this.saving = false;
    this.archivoAptitud = null;
    this.archivoEmo = null;
    this.documentoInterconsulta = null;
  }

  agregarRestriccion(): void {
    const txt = this.nuevaRestriccion.trim();
    if (!txt) return;
    this.restricciones.push({ descripcionLibre: txt });
    this.nuevaRestriccion = '';
  }

  quitarRestriccion(i: number): void { this.restricciones.splice(i, 1); }

  onArchivoAptitud(event: Event): void {
    this.archivoAptitud = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onArchivoEmo(event: Event): void {
    this.archivoEmo = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onDocumentoInterconsulta(event: Event): void {
    this.documentoInterconsulta = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  close(): void { this.closed.emit(); }

  private subirDocumentos(emoId: number): void {
    const url = `${SALUD_OCUPACIONAL_BASE}/emos/${emoId}/documentos`;
    const headers = buildAuthHeaders();
    if (this.archivoAptitud) {
      const fd = new FormData();
      fd.append('file', this.archivoAptitud);
      fd.append('tipo', 'Aptitud');
      this.http.post(url, fd, { headers }).subscribe({ error: () => {} });
    }
    if (this.archivoEmo) {
      const fd = new FormData();
      fd.append('file', this.archivoEmo);
      fd.append('tipo', 'EMO');
      this.http.post(url, fd, { headers }).subscribe({ error: () => {} });
    }
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
        diagnostico: this.icDiagnostico.trim() || undefined,
        requiereSeguimiento: this.aptitud === 'No Apto' ? this.icRequiereSeguimiento : false,
      };
    }

    const emoDto: EmoCreateDto = {
      workerId: this.programacion.workerId,
      tipoEmoId: this.programacion.tipoEmoId ?? 0,
      empresaOrigenId: this.programacion.empresaId ?? undefined,
      fechaEmo: new Date().toISOString().split('T')[0],
      aptitud: this.aptitud,
      requiereInterconsulta: this.requiereInterconsulta,
      notas: this.notas || undefined,
      fechaLectura: this.lecturaRealizada ? (this.fechaLectura || undefined) : undefined,
      examenes: [],
      restricciones: restriccionesPayload,
      interconsultaInline,
    };

    this.emoSvc.createEmo(emoDto, this.documentoInterconsulta ?? undefined).subscribe({
      next: (res) => {
        const emoId = res.id;
        if (this.interconsultaId != null) {
          // Contexto interconsultas: no hay programación real, omitir accionClinica
          this.subirDocumentos(emoId);
          this.saving = false;
          this.loaderService.hide();
          this.completado.emit();
        } else {
          // Contexto agenda: flujo original con accionClinica
          this.progSvc.accionClinica(this.programacion!.id, {
            id: this.programacion!.id,
            accion: 'Completar',
            emoResultadoId: emoId,
          }).subscribe({
            next: () => {
              this.subirDocumentos(emoId);
              this.saving = false;
              this.loaderService.hide();
              this.completado.emit();
            },
            error: (err) => { this.saving = false; this.loaderService.hide(); this.errorService.handleError(err); },
          });
        }
      },
      error: (err) => { this.saving = false; this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }
}
