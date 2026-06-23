import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { FlashReportDetalleDto, NIVELES_CONSECUENCIA } from '../../accidente-incidente.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './accidente-detalle.component.html',
  styleUrl: './accidente-detalle.component.css',
})
export class AccidenteDetalleComponent implements OnInit {
  id!: number;
  detalle: FlashReportDetalleDto | null = null;
  loading = true;
  enviando = false;

  readonly nivelesConsecuencia = NIVELES_CONSECUENCIA;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getDetalle(this.id).subscribe({
      next: (res) => {
        this.detalle = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  irAEditar(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes/lista']);
  }

  async confirmarEnviar(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Enviar Flash Report?',
      html: `Se generará el PDF del Flash Report <strong>${this.detalle?.codigo}</strong>, se subirá a SharePoint y se enviará por correo a SSOMA y Proyectos.<br><br>Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1b3a2d',
    });
    if (!result.isConfirmed) return;

    this.enviando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    this.service.enviar(this.id).subscribe({
      next: async (res) => {
        this.enviando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: 'Flash Report enviado',
          text: res.message,
          timer: 2500,
          showConfirmButton: false,
        });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  nivelLabel(n?: number): string {
    return n && n >= 1 && n <= 6 ? this.nivelesConsecuencia[n] : '—';
  }

  nivelClass(n?: number): string {
    if (!n) return '';
    if (n <= 2) return 'nivel-bajo';
    if (n <= 3) return 'nivel-medio';
    if (n <= 4) return 'nivel-alto';
    return 'nivel-critico';
  }

  tipoClass(codigo: string): string {
    const map: Record<string, string> = { AC: 'tipo-accidente', IN: 'tipo-incidente', NC: 'tipo-nc', AL: 'tipo-alerta' };
    return map[codigo] ?? 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Enviado') return 'estado-enviado';
    return 'estado-borrador';
  }
}
