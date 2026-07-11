import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { ConvalidacionService } from '../../../services/convalidacion.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { EmpresaSimpleDto, MedicoSimpleDto } from '../../../dtos/catalogos.model';
import { ConvalidacionListDto, ConvalidacionResultado } from '../../../dtos/convalidacion.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-convalidacion-review',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DocumentViewer],
  templateUrl: './convalidacion-review.html',
  styleUrl: './convalidacion-review.css',
})
export class ConvalidacionReview implements OnChanges {
  @Input() open = false;
  @Input() item: ConvalidacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  medicos: MedicoSimpleDto[] = [];
  empresas: EmpresaSimpleDto[] = [];

  resultado: ConvalidacionResultado = 'Pendiente';
  fechaVencimiento = '';
  medicoId: number | null = null;
  empresaDestinoId: number | null = null;
  notas = '';
  saving = false;

  visorUrl = '';
  visorNombre = '';

  readonly resultadoOptions = [
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Aprobada', nombre: 'Aprobada' },
    { id: 'Aprobada con Observaciones', nombre: 'Aprobada con Observaciones' },
    { id: 'Rechazada', nombre: 'Rechazada' },
  ];

  constructor(
    private service: ConvalidacionService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.item) {
      this.resultado = (this.item.resultado as ConvalidacionResultado) ?? 'Pendiente';
      this.fechaVencimiento = this.item.fechaVencimiento || this.item.emoFechaVencimiento || '';
      this.medicoId = null;
      this.empresaDestinoId = this.item.empresaDestinoId ?? null;
      this.notas = this.item.notas ?? '';
      this.saving = false;
      if (!this.medicos.length) {
        this.catalogos.getMedicos().subscribe((res) => {
          // Solo médicos internos de Abril (sin clínica externa asociada) pueden
          // firmar convalidaciones — los de clínicas contratadas no aplican acá.
          this.medicos = res.filter((m) => !m.clinicaId);
          this.cdr.detectChanges();
        });
      }
      if (!this.empresas.length) {
        this.catalogos.getEmpresas().subscribe((res) => {
          this.empresas = res;
          this.cdr.detectChanges();
        });
      }
    }
  }

  get fechaVencimientoRequerida(): boolean {
    return this.resultado === 'Aprobada' || this.resultado === 'Aprobada con Observaciones';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (this.fechaVencimientoRequerida && !this.fechaVencimiento) return false;
    if (!this.empresaDestinoId) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit || !this.item) return;

    const payload = {
      fechaConvalidacion: this.item.fechaConvalidacion,
      empresaDestinoId: this.empresaDestinoId ?? undefined,
      medicoId: this.medicoId ?? undefined,
      resultado: this.resultado,
      fechaVencimiento: this.fechaVencimiento || undefined,
      notas: this.notas || undefined,
    };

    this.saving = true;
    this.loaderService.show();
    this.service.updateConvalidacion(this.item.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Convalidación actualizada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  verDocumento(url: string | undefined | null, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  close(): void {
    this.closed.emit();
  }
}
