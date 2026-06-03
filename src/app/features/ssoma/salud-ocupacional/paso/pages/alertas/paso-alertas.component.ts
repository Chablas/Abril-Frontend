import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoAlertaDto, PasoActividadDto } from '../../dtos/paso.dtos';
import { EjecucionModalComponent } from '../../components/ejecucion-modal/ejecucion-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-paso-alertas',
  standalone: true,
  imports: [CommonModule, EjecucionModalComponent],
  templateUrl: './paso-alertas.component.html',
})
export class PasoAlertasComponent implements OnInit {
  alertas: PasoAlertaDto[] = [];
  loading = false;
  tabActiva: 'vencidas' | 'proximas' = 'vencidas';

  actividadEjecutando: PasoActividadDto | null = null;
  loadingActividad = false;

  constructor(
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.pasoService.getAlertas().subscribe({
      next: (res) => {
        this.alertas = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get vencidas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipo === 'Vencida');
  }

  get proximas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipo === 'ProximaVencer');
  }

  get activas(): PasoAlertaDto[] {
    return this.tabActiva === 'vencidas' ? this.vencidas : this.proximas;
  }

  registrar(alerta: PasoAlertaDto): void {
    this.loadingActividad = true;
    this.actividadService.getById(alerta.ejecucionId).subscribe({
      next: (a) => {
        this.actividadEjecutando = a;
        this.loadingActividad = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingActividad = false;
        this.cdr.detectChanges();
      },
    });
  }

  onEjecucionCreada(): void {
    this.actividadEjecutando = null;
    this.load();
  }
}
