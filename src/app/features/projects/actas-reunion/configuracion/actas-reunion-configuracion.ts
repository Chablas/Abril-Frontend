import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ReunionFolderDTO } from '../dtos/actas-reunion.dto';

/**
 * Configuración de la carpeta de SharePoint/OneDrive donde se guardan los archivos
 * adjuntos de las actas de reunión. Existe un único registro: el usuario pega un link,
 * el sistema lo detecta (resuelve la carpeta vía Graph) y a partir de ahí todos los
 * adjuntos se suben ahí (en una subcarpeta por reunión).
 */
@Component({
  selector: 'app-actas-reunion-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actas-reunion-configuracion.html',
})
export class ActasReunionConfiguracion implements OnInit {
  folder: ReunionFolderDTO | null = null;
  linkUrl = '';

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  volver(): void {
    this.router.navigate(['/projects/actas-reunion']);
  }

  load(): void {
    this.loaderService.show();
    this.service.getCarpeta().subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res?.linkUrl ?? '';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(): void {
    if (!this.linkUrl.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Ingresa el link de la carpeta (SharePoint u OneDrive).',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service.saveCarpeta(this.linkUrl.trim()).subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res.linkUrl;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Carpeta configurada',
          text: res.folderName
            ? `Los adjuntos de las actas se guardarán en: ${res.folderName}`
            : 'Carpeta detectada y guardada exitosamente.',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
