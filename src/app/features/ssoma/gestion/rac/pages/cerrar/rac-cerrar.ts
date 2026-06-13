import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RacService } from '../../services/rac.service';
import { RacDetalleDto, RacCerrarRequest } from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rac-cerrar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './rac-cerrar.html',
  styleUrl: './rac-cerrar.css',
})
export class RacCerrar implements OnInit {
  rac: RacDetalleDto | null = null;
  loading = false;
  guardando = false;
  cierreDescripcion = '';
  fotoCierre: File | null = null;
  fotoCierrePreview: string | null = null;
  subiendoFoto = false;
  fotoCierreUrl: string | null = null;

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/ssoma/gestion/rac/lista']);
      return;
    }
    this.loadRac(id);
  }

  loadRac(id: number): void {
    this.loading = true;
    this.loaderService.show();
    this.racService.getDetalle(id).subscribe({
      next: (rac) => {
        this.rac = rac;
        if (rac.estado === 'Cerrado') {
          this.router.navigate(['/ssoma/gestion/rac', id]);
          return;
        }
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get puedeGuardar(): boolean {
    return this.cierreDescripcion.trim().length >= 10
      && !!this.fotoCierreUrl
      && !this.guardando;
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fotoCierre = file;
    this.fotoCierreUrl = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.fotoCierrePreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
    this.subirFotoCierre();
  }

  subirFotoCierre(): void {
    if (!this.fotoCierre || !this.rac || this.subiendoFoto) return;
    this.subiendoFoto = true;
    this.cdr.markForCheck();
    this.racService.subirFoto(this.rac.id, this.fotoCierre, 'Cierre').subscribe({
      next: (res) => {
        this.fotoCierreUrl = res.url;
        this.subiendoFoto = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.subiendoFoto = false;
        Swal.fire('Error', 'No se pudo subir la foto', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  confirmarCierre(): void {
    if (!this.puedeGuardar || !this.rac) return;
    Swal.fire({
      title: '¿Cerrar este RAC?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e7d32',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.guardar();
    });
  }

  guardar(): void {
    const req: RacCerrarRequest = {
      cierreDescripcion: this.cierreDescripcion.trim(),
      fotoCierreUrl: this.fotoCierreUrl!,
    };
    this.guardando = true;
    this.loaderService.show();
    this.racService.cerrar(this.rac!.id, req).subscribe({
      next: (rac) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'RAC cerrado',
          text: `RAC ${rac.codigo} cerrado correctamente`,
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          this.router.navigate(['/ssoma/gestion/rac', rac.id]);
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/rac', this.rac?.id]);
  }

  severidadClass(sev: string): string {
    switch (sev?.toUpperCase()) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      case 'BAJO':    return 'badge-bajo';
      default:        return 'badge-default';
    }
  }
}
