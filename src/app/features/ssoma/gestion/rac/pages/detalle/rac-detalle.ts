import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RacService } from '../../services/rac.service';
import { RacDetalleDto } from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rac-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DraggableImage],
  templateUrl: './rac-detalle.html',
  styleUrl: './rac-detalle.css',
})
export class RacDetalle implements OnInit {
  rac: RacDetalleDto | null = null;
  loading = false;
  descargandoPdf = false;
  readonly anioActual = new Date().getFullYear();
  private readonly SP_FOTOS_BASE =
    'https://abrilinmob.sharepoint.com/sites/SSOMA-Powerapps/RacFotos2026';

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Cerrar/levantar un RAC es solo de la empresa observada (reportada). Los usuarios
   * internos de Abril cierran cualquiera; un contratista solo si su empresa es la
   * reportada — no cuando solo es la reportante (que reportó el RAC contra otra).
   * El backend aplica la misma regla; esto evita ofrecerle el botón y que llegue a
   * subir la evidencia para luego ser rechazado.
   */
  get puedeCerrar(): boolean {
    if (!this.rac || this.rac.estado !== 'Abierto') return false;
    if (!this.authService.isContratista()) return true;
    return this.authService.getEmpresaId() === this.rac.empresaReportadaId;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/ssoma/gestion/rac/lista']);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.loaderService.show();
    this.racService.getDetalle(id).subscribe({
      next: (rac) => {
        this.rac = rac;
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

  irACerrar(): void {
    this.router.navigate(['/ssoma/gestion/rac', this.rac!.id, 'cerrar']);
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/rac/lista']);
  }

  descargarPdf(): void {
    if (!this.rac || this.descargandoPdf) return;
    this.descargandoPdf = true;
    this.racService.getReportePdf(this.rac.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RAC_${this.rac!.codigo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.descargandoPdf = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.descargandoPdf = false;
        Swal.fire('Error', 'No se pudo descargar el PDF', 'error');
        this.cdr.markForCheck();
      },
    });
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

  estadoClass(est: string): string {
    switch (est) {
      case 'Abierto': return 'estado-abierto';
      case 'Cerrado': return 'estado-cerrado';
      default:        return '';
    }
  }

  fotoUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.SP_FOTOS_BASE + (url.startsWith('/') ? url : '/' + url);
  }

  formatFecha(f: string | undefined): string {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
