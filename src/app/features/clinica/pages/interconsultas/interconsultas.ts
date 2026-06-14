import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { InterconsultaService } from '../../../ssoma/salud-ocupacional/services/interconsulta.service';
import {
  InterconsultaListDto,
  InterconsultaDetalleDto,
  InterconsultaUpdateDto,
} from '../../../ssoma/salud-ocupacional/dtos/interconsulta.model';
import { ProgramacionClinicaDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CompletarEmo } from '../agenda/components/completar-emo/completar-emo';

interface Paso1Data {
  resultado: string;
  especialidad: string;
  diagnostico: string;
  notas: string;
  archivo: File | null;
  archivoNombre: string;
  archivoTamano: string;
  archivoError: string;
}

@Component({
  selector: 'app-interconsultas-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule, CompletarEmo, AbrilPageHeaderComponent],
  templateUrl: './interconsultas.html',
  styleUrls: ['./interconsultas.css'],
})
export class InterconsultasClinica implements OnInit {
  items: InterconsultaListDto[] = [];
  loading = false;
  filtroEstado = 'Pendiente';
  filtroSearch = '';

  // Ver / editar interconsulta existente (no pendiente)
  viendo: InterconsultaDetalleDto | null = null;
  form: InterconsultaUpdateDto = {};
  saving = false;

  // Flujo "Resolver" en 2 pasos
  interconsultaActiva: InterconsultaListDto | null = null;
  pasoActivo: 1 | 2 | null = null;
  paso1: Paso1Data = this.emptyPaso1();
  programacionSintetica: ProgramacionClinicaDto | null = null;

  readonly resultadoOpts = ['Apto', 'No Apto', 'Observado', 'En seguimiento'];
  readonly estados = ['', 'Pendiente', 'Atendida', 'Cancelada'];

  constructor(
    private svc: InterconsultaService,
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
    this.svc
      .getInterconsultas({
        estado: this.filtroEstado || undefined,
        search: this.filtroSearch || undefined,
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data ?? [];
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ── Flujo Resolver ───────────────────────────────────────
  abrirResolver(item: InterconsultaListDto): void {
    this.interconsultaActiva = item;
    this.paso1 = this.emptyPaso1();
    this.paso1.especialidad = item.especialidad;
    this.pasoActivo = 1;
  }

  onArchivoPaso1(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.paso1.archivoError = '';
    if (!file) {
      this.paso1.archivo = null;
      this.paso1.archivoNombre = '';
      this.paso1.archivoTamano = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.paso1.archivoError = 'El archivo no debe superar 10 MB.';
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.paso1.archivo = file;
    this.paso1.archivoNombre = file.name;
    this.paso1.archivoTamano = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get paso1Valido(): boolean {
    return !!this.paso1.resultado && !!this.paso1.especialidad.trim();
  }

  continuarPaso2(): void {
    if (!this.interconsultaActiva || !this.paso1Valido) return;
    this.programacionSintetica = {
      id: this.interconsultaActiva.emoId,
      workerId: this.interconsultaActiva.workerId,
      workerNombre: this.interconsultaActiva.workerNombre,
      workerDni: this.interconsultaActiva.workerDni,
      tipoEmo: this.interconsultaActiva.especialidad,
      tipoEmoId: 0,
      empresa: '',
      empresaId: undefined,
      fechaProgramada: new Date().toISOString().split('T')[0],
      horaProgramada: null,
      clinica: null,
      medico: null,
      estado: 'En Atención',
      motivo: null,
      checkInHora: null,
      motivoRechazo: null,
      emoResultadoId: null,
    };
    this.pasoActivo = 2;
  }

  onEmoCompletado(): void {
    if (!this.interconsultaActiva) return;
    this.svc
      .updateInterconsulta(this.interconsultaActiva.id, {
        estado: 'Atendida',
        diagnostico: this.paso1.diagnostico || undefined,
        notas: this.paso1.notas || undefined,
      })
      .subscribe({
        next: () => {
          this.cancelarResolucion();
          this.load();
        },
        error: (err) => this.errorService.handleError(err),
      });
  }

  cancelarResolucion(): void {
    this.interconsultaActiva = null;
    this.pasoActivo = null;
    this.programacionSintetica = null;
    this.paso1 = this.emptyPaso1();
  }

  // ── Ver / Editar (no pendiente) ──────────────────────────
  abrirVer(item: InterconsultaListDto): void {
    this.loaderService.show();
    this.svc.getInterconsulta(item.id).subscribe({
      next: (detalle) => {
        this.viendo = detalle;
        this.form = {
          fechaAtencion: detalle.fechaAtencion ?? '',
          diagnostico: detalle.diagnostico ?? '',
          cie10: detalle.cie10 ?? '',
          resultado: detalle.resultado ?? '',
          urlInforme: detalle.urlInforme ?? '',
          estado: detalle.estado,
          notas: detalle.notas ?? '',
        };
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrarVer(): void {
    this.viendo = null;
    this.form = {};
  }

  guardar(): void {
    if (!this.viendo) return;
    this.saving = true;
    this.svc.updateInterconsulta(this.viendo.id, this.form).subscribe({
      next: () => {
        this.saving = false;
        this.cerrarVer();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  get pendientesCount(): number {
    return this.items.filter((i) => i.estado === 'Pendiente').length;
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      Pendiente: 'chip-orange',
      Atendida: 'chip-green',
      Cancelada: 'chip-gray',
    };
    return map[estado] ?? 'chip-gray';
  }

  diasClass(dias: number, estado: string): string {
    if (estado !== 'Pendiente') return 'chip-muted';
    if (dias > 15) return 'chip-red';
    if (dias >= 8) return 'chip-orange';
    return 'chip-green';
  }

  private emptyPaso1(): Paso1Data {
    return {
      resultado: '',
      especialidad: '',
      diagnostico: '',
      notas: '',
      archivo: null,
      archivoNombre: '',
      archivoTamano: '',
      archivoError: '',
    };
  }
}
