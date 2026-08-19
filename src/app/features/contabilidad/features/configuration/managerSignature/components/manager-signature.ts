import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { ManagerSignatureService } from '../services/manager-signature.service';
import { ManagerSignatureDto } from '../dtos/manager-signature.dto';
import { SignaturePad } from '../../../../../../shared/components/signature-pad/signature-pad';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Subsección "Firma" de la Configuración de Contabilidad.
 * Permite dibujar una firma con el mouse (o táctil) en un canvas y guardarla. Esa firma es
 * personal: se guarda en el registro de Person del usuario actual y se estampa en los documentos
 * que dicho usuario firme.
 *
 * El lienzo es el componente compartido `app-signature-pad`, el mismo que usa el postulante para
 * registrar su firma en su carta oferta (Gestión GTH · Onboarding): las dos firmas terminan en las
 * mismas columnas de Person y se estampan con el mismo helper del backend.
 */
@Component({
  selector: 'app-manager-signature',
  standalone: true,
  imports: [CommonModule, SignaturePad],
  templateUrl: './manager-signature.html',
})
export class ManagerSignature implements OnInit {
  @ViewChild('pad') pad!: SignaturePad;

  current: ManagerSignatureDto | null = null;
  hasDrawing = false;

  constructor(
    private service: ManagerSignatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.get().subscribe({
      next: (res) => {
        this.current = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  clear(): void {
    this.pad?.clear();
  }

  save(): void {
    const dataUrl = this.pad?.toDataUrl();
    if (!dataUrl) {
      Swal.fire({ icon: 'warning', title: 'Firma vacía', text: 'Dibuja la firma antes de guardar.' });
      return;
    }

    this.loaderService.show();
    this.service.save(dataUrl).subscribe({
      next: (res) => {
        this.current = res;
        this.clear();
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Firma guardada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
