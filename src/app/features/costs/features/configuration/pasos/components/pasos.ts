import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CostsPasosService } from '../services/costs-pasos.service';
import { CostsPasoDto, CostsPasoOptionDto } from '../dtos/costs-paso.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Sección "Pasos" de Configuración de Costos: una minisección por cada paso del flujo de
 * adjudicaciones con las opciones que se pueden prender/apagar.
 *
 * La pantalla no conoce ninguna opción en concreto: renderiza lo que devuelve el backend
 * (tabla project_sub_contractor_step_option), así que agregar una opción nueva no toca
 * este componente.
 */
@Component({
  selector: 'app-costs-pasos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pasos.html',
})
export class CostsPasos implements OnInit {
  pasos: CostsPasoDto[] = [];
  /** Id de la opción que se está guardando (para bloquear solo ese checkbox). */
  savingOptionId: number | null = null;
  loaded = false;

  constructor(
    private service: CostsPasosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  trackByStep = (_: number, paso: CostsPasoDto) => paso.stepNumber;
  trackByOption = (_: number, option: CostsPasoOptionDto) => option.projectSubContractorStepOptionId;

  private load(): void {
    this.loaderService.show();
    this.service.getPasos().subscribe({
      next: (pasos) => {
        this.pasos = pasos;
        this.loaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleOption(option: CostsPasoOptionDto): void {
    if (this.savingOptionId !== null) return;

    // El valor se aplica de una y se revierte si el guardado falla. Dejarlo sin aplicar no
    // sirve: el navegador ya marcó el input y, como el valor ligado no cambiaría, Angular no
    // lo repintaría — el checkbox quedaría mostrando algo que no se guardó.
    const valorPrevio = option.enabled;
    option.enabled = !valorPrevio;
    this.savingOptionId = option.projectSubContractorStepOptionId;

    this.service
      .updateOption({
        projectSubContractorStepOptionId: option.projectSubContractorStepOptionId,
        enabled: option.enabled,
      })
      .subscribe({
        next: () => {
          this.savingOptionId = null;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          option.enabled = valorPrevio;
          this.savingOptionId = null;
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }
}
