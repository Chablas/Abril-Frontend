import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { PlazoRendicionService } from './services/plazo-rendicion.service';
import { PlazoRendicion } from './dtos/plazo-rendicion.dto';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

/**
 * Sección "Días reembolsables" de Mis Rendiciones → Configuración: cuántos días hábiles del mes
 * siguiente dura el plazo para rendir un mes. Era un 7 escrito en el backend; ahora vive en
 * `ga_rendicion_config` y se cambia acá.
 *
 * A diferencia de los correos —que guardan al momento de tocar cada control— este campo tiene su
 * botón "Guardar": es un número que se escribe de a dígitos y guardar en cada tecla mandaría
 * plazos intermedios (un 1 camino al 15) que cierran periodos de verdad.
 */
@Component({
  selector: 'app-ga-dias-reembolsables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dias-reembolsables.html',
  // Misma tarjeta y mismos botones que la matriz de correos: las dos secciones se ven igual.
  styleUrl: '../../../../../shared/styles/correos-config.css',
  styles: [`
    :host { display: block; width: 100%; }

    /* El campo es un número de dos dígitos: a ancho completo se leería como un cuadro vacío. */
    .plazo-field { max-width: 220px; }

    .plazo-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
    }

    .plazo-ok {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-abril-standard, #0f6e56);
    }
  `],
})
export class GaDiasReembolsables implements OnInit {
  plazo: PlazoRendicion | null = null;
  loading = false;
  saving = false;

  /** Lo que hay escrito en el campo. Se separa del dato guardado para poder comparar. */
  dias: number | null = null;

  /** Mensaje de validación del propio campo (el backend valida igual). */
  error: string | null = null;
  /** Se prende un momento después de guardar bien: aviso de estado, no un alert. */
  guardado = false;

  private readonly meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  constructor(
    private service: PlazoRendicionService,
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
    this.service.get().subscribe({
      next: (data) => {
        this.aplicar(data);
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

  private aplicar(data: PlazoRendicion): void {
    this.plazo = data;
    this.dias = data.diasHabilesPlazo;
    this.error = null;
  }

  get minimo(): number {
    return this.plazo?.diasMinimo ?? 1;
  }

  get maximo(): number {
    return this.plazo?.diasMaximo ?? 28;
  }

  /** El mes anterior en palabras ("agosto 2026"), para el aviso del plazo vigente. */
  get periodoAnterior(): string {
    if (!this.plazo) return '';
    const nombre = this.meses[this.plazo.mesAnteriorMes - 1] ?? '';
    return `${nombre} ${this.plazo.mesAnteriorAnio}`;
  }

  /** Fecha límite como Date, para el pipe (el backend la manda como YYYY-MM-DD, sin zona). */
  get limiteFecha(): Date | null {
    return this.plazo ? new Date(`${this.plazo.limiteMesAnterior}T00:00:00`) : null;
  }

  onDiasChange(valor: number | null): void {
    this.dias = valor;
    this.error = null;
    this.guardado = false;
  }

  get hayCambios(): boolean {
    return this.plazo != null && this.dias != null && this.dias !== this.plazo.diasHabilesPlazo;
  }

  get puedeGuardar(): boolean {
    return !this.saving && !this.loading && this.hayCambios;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;

    const valor = Number(this.dias);
    if (!Number.isInteger(valor) || valor < this.minimo || valor > this.maximo) {
      this.error = `El plazo tiene que ser un número entero entre ${this.minimo} y ${this.maximo}.`;
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = null;
    this.guardado = false;

    this.service.guardar(valor).subscribe({
      next: (res) => {
        this.saving = false;
        this.guardado = true;
        if (res?.plazo) this.aplicar(res.plazo);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400 trae el rango que rechazó el backend: se muestra junto al campo, no en un alert.
        if (err.status === 400) {
          this.error = err.error?.message ?? 'No se pudo guardar el plazo.';
        } else {
          this.errorService.handleError(err);
        }
        this.cdr.detectChanges();
      },
    });
  }
}
