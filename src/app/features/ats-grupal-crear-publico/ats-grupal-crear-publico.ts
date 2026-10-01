import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { AtsService } from '../ssoma/gestion/ats/services/ats.service';
import { AtsGrupoProyectoPublicoDto, AtsGrupoWorkerOpcionDto, AtsGrupoCrearResponseDto } from '../ssoma/gestion/ats/dtos/ats.dtos';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { AtsNuevo } from '../ssoma/gestion/ats/pages/nuevo/ats-nuevo';

/**
 * Página PÚBLICA (sin login) que abre el QR FIJO de un proyecto — a diferencia de
 * /ats-grupal/:token (que es para ADHERIRSE a un grupo que YA existe), esta es para CREAR un
 * ATS Grupal nuevo desde cero: cualquier integrante de la cuadrilla, incluso sin cuenta en la
 * plataforma, se identifica (nombre de una lista acotada al proyecto + últimos dígitos de su DNI)
 * y llena el mismo wizard que el flujo logueado (reusa <app-ats-nuevo> en modoPublico). Al
 * terminar, esta página muestra directo el QR de adhesión resultante — el creador no tiene cómo
 * ver el dashboard logueado, así que lo ve acá mismo. Decisión de Samuel 2026-09-30.
 */
@Component({
  selector: 'app-ats-grupal-crear-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AtsNuevo],
  templateUrl: './ats-grupal-crear-publico.html',
  styleUrl: './ats-grupal-crear-publico.css',
})
export class AtsGrupalCrearPublico implements OnInit {
  tokenProyecto = '';
  cargando = true;
  resumen: AtsGrupoProyectoPublicoDto | null = null;

  workers: AtsGrupoWorkerOpcionDto[] = [];
  workerId: number | null = null;
  dniConfirmacion = '';
  nombreConfirmado = '';

  paso: 'identidad' | 'wizard' | 'exito' = 'identidad';

  grupoCreado: AtsGrupoCrearResponseDto | null = null;
  qrDataUrl: string | null = null;

  constructor(
    private svc: AtsService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tokenProyecto = this.route.snapshot.paramMap.get('token') ?? '';
    this.svc.getResumenProyectoPublico(this.tokenProyecto).subscribe({
      next: (res) => {
        this.resumen = res;
        this.workers = res.trabajadores;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.resumen = { valido: false, motivoInvalido: 'No se pudo cargar este código. Intenta de nuevo.', trabajadores: [] };
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get puedeContinuarIdentidad(): boolean {
    return !!this.workerId && this.dniConfirmacion.trim().length >= 3;
  }

  irAWizard(): void {
    if (!this.puedeContinuarIdentidad) return;
    this.nombreConfirmado = this.workers.find((w) => w.workerId === this.workerId)?.nombre ?? '';
    this.dniConfirmacion = this.dniConfirmacion.trim();
    this.paso = 'wizard';
    this.cdr.detectChanges();
  }

  onGrupoCreado(res: AtsGrupoCrearResponseDto): void {
    this.grupoCreado = res;
    this.paso = 'exito';
    this.cdr.detectChanges();
    this.generarQr(res.qrToken);
  }

  onWizardCancelado(): void {
    this.paso = 'identidad';
    this.workerId = null;
    this.dniConfirmacion = '';
    this.cdr.detectChanges();
  }

  private generarQr(token: string): void {
    QRCode.toDataURL(this.linkAdhesion, { width: 320, margin: 2 }).then((dataUrl) => {
      this.qrDataUrl = dataUrl;
      this.cdr.detectChanges();
    });
  }

  get linkAdhesion(): string {
    return this.grupoCreado ? `${window.location.origin}/ats-grupal/${this.grupoCreado.qrToken}` : '';
  }

  copiarLink(): void {
    if (!this.linkAdhesion) return;
    navigator.clipboard?.writeText(this.linkAdhesion);
  }

  crearOtro(): void {
    this.grupoCreado = null;
    this.qrDataUrl = null;
    this.workerId = null;
    this.dniConfirmacion = '';
    this.paso = 'identidad';
    this.cdr.detectChanges();
  }
}
