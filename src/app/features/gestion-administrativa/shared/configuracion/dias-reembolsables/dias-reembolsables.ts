import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { PlazoRendicionService } from './services/plazo-rendicion.service';
import { AlcanceRendicionOpcion, PlazoRendicion } from './dtos/plazo-rendicion.dto';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { NoWheelNumberDirective } from '../../../../../shared/directives/no-wheel-number.directive';

/**
 * Sección "Días reembolsables" de Solicitud de Salidas → Configuración: cuántos días hábiles del mes
 * siguiente dura el plazo para rendir un mes, y hasta qué mes hacia atrás alcanza ese permiso. Era
 * un 7 escrito en el backend con "solo el mes anterior" a mano; ahora todo vive en
 * `ga_rendicion_config` y se cambia acá.
 *
 * Los dos alcances contestan preguntas distintas y por eso son dos campos:
 *  • "Dentro del plazo" — cuánto abre la ventana de días hábiles del mes siguiente.
 *  • "En cualquier momento" — cuánto queda abierto todo el mes, con ventana o sin ella. Vacío = no
 *    aplica; puesto, MANDA sobre el anterior. Es el interruptor para dejar rendir lo atrasado
 *    mientras se capacita a los trabajadores.
 *
 * A diferencia de los correos —que guardan al momento de tocar cada control— esta sección tiene su
 * botón "Guardar": los días se escriben de a dígitos y guardar en cada tecla mandaría plazos
 * intermedios (un 1 camino al 15) que cierran periodos de verdad. Los tres campos son una sola
 * regla, así que van en el mismo guardado.
 *
 * El único aviso de estado es DESDE QUÉ MES se puede rendir hoy: es lo que no se deduce mirando los
 * tres campos, y lo que importa es lo que queda abierto hacia atrás, no hasta cuándo dura.
 */
@Component({
  selector: 'app-ga-dias-reembolsables',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, NoWheelNumberDirective],
  templateUrl: './dias-reembolsables.html',
  // Misma tarjeta y mismos botones que la matriz de correos: las dos secciones se ven igual.
  styleUrl: '../../../../../shared/styles/correos-config.css',
  styles: [`
    :host { display: block; width: 100%; }

    /* El campo es un número de dos dígitos: a ancho completo se leería como un cuadro vacío. */
    .plazo-field { max-width: 220px; }

    .plazo-sub {
      margin-top: 4px;
      padding-top: 16px;
      border-top: 1px solid var(--color-abril-border, #e5e7eb);
    }

    .plazo-sub__title {
      margin: 0 0 12px;
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--color-abril-text, #111827);
    }

    /* Los dos desplegables uno al lado del otro mientras entren; apilados en pantalla angosta. */
    .plazo-alcances {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
      max-width: 720px;
    }

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

  /** Lo elegido en los desplegables, también antes de guardar. */
  alcancePlazoId: number | null = null;
  alcancePermanenteId: number | null = null;

  /** Mensaje de validación del propio campo (el backend valida igual). */
  error: string | null = null;
  /** Se prende un momento después de guardar bien: aviso de estado, no un alert. */
  guardado = false;

  private readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
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
    this.alcancePlazoId = data.alcancePlazoId;
    this.alcancePermanenteId = data.alcancePermanenteId;
    this.error = null;
  }

  get minimo(): number {
    return this.plazo?.diasMinimo ?? 1;
  }

  get maximo(): number {
    return this.plazo?.diasMaximo ?? 28;
  }

  /** Opciones de los dos desplegables: las mismas para ambos. */
  get alcances(): AlcanceRendicionOpcion[] {
    return this.plazo?.alcances ?? [];
  }

  /**
   * Mes más viejo que HOY se puede rendir, en palabras ("Marzo 2026"). Lo resuelve el backend —
   * necesita los feriados— y es lo único que se muestra: el efecto de los tres campos juntos, que
   * es justo lo que no se lee mirándolos.
   */
  get rendibleDesde(): string {
    if (!this.plazo) return '';
    const nombre = this.meses[this.plazo.rendibleDesdeMes - 1] ?? '';
    return `${nombre} ${this.plazo.rendibleDesdeAnio}`;
  }

  onDiasChange(valor: number | null): void {
    this.dias = valor;
    this.tocado();
  }

  onAlcancePlazoChange(valor: number | null): void {
    this.alcancePlazoId = valor;
    this.tocado();
  }

  onAlcancePermanenteChange(valor: number | null): void {
    // El desplegable emite null al limpiarlo, que es justo "no aplica": se guarda tal cual.
    this.alcancePermanenteId = valor;
    this.tocado();
  }

  private tocado(): void {
    this.error = null;
    this.guardado = false;
  }

  get hayCambios(): boolean {
    if (!this.plazo) return false;
    return (this.dias != null && this.dias !== this.plazo.diasHabilesPlazo)
        || this.alcancePlazoId !== this.plazo.alcancePlazoId
        || (this.alcancePermanenteId ?? null) !== this.plazo.alcancePermanenteId;
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

    if (!this.alcancePlazoId) {
      this.error = 'Elige hasta qué mes alcanza el plazo.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = null;
    this.guardado = false;

    this.service.guardar({
      diasHabilesPlazo: valor,
      alcancePlazoId: this.alcancePlazoId,
      alcancePermanenteId: this.alcancePermanenteId ?? null,
    }).subscribe({
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
