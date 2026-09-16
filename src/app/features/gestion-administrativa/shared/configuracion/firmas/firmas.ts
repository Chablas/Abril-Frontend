import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { GaFirmasService } from './services/firmas.service';
import { FirmaTipoCodigo, FirmaTipoDto } from '../../../../../core/firma/firma-personal.dto';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

/**
 * Sección "Firmas" de Consolidados → Configuración: cómo se registra la firma que el jefe estampa
 * al aprobar un consolidado.
 *
 * Con un solo tipo marcado, quien va a firmar y no tiene registrada una firma DE ESE TIPO se la
 * pide el modal de la pantalla —aunque tenga la otra—; con los dos marcados, cualquiera sirve y
 * puede elegir. Y en los tres casos, quien ya tiene la que corresponde firma de frente.
 *
 * Guarda al tocar cada checkbox, igual que la matriz de correos de esta misma pantalla: es una
 * marca de dos estados y no un valor que se escriba de a poco (ahí sí hay botón "Guardar").
 */
@Component({
  selector: 'app-ga-firmas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firmas.html',
  // Misma tarjeta y mismos avisos que la matriz de correos: las secciones se ven igual.
  styleUrl: '../../../../../shared/styles/correos-config.css',
  styles: [`
    :host { display: block; width: 100%; }

    .firma-checks {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 4px;
    }

    /* Mismo checkbox que "Incluir sub-áreas" en la matriz de correos. */
    .firma-check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .firma-check input {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--color-abril-standard, #0f6e56);
      cursor: pointer;
      flex-shrink: 0;
    }
    .firma-check--bloqueado,
    .firma-check--bloqueado input { cursor: not-allowed; }

    .firma-check__text { display: flex; flex-direction: column; gap: 2px; }
    .firma-check__label { font-size: 0.88rem; font-weight: 600; color: #334155; }
    .firma-check__hint { font-size: 0.78rem; color: #64748b; }

    .firma-ok {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-abril-standard, #0f6e56);
    }
  `],
})
export class GaFirmas implements OnInit {
  tipos: FirmaTipoDto[] = [];
  loading = false;
  saving = false;

  /** Se prende un momento después de guardar bien: aviso de estado, no un alert. */
  guardado = false;

  /** Texto de cada tipo en la pantalla. El `nombre` del catálogo es el del dato, no el de la UI. */
  private static readonly TEXTOS: Record<FirmaTipoCodigo, { label: string; hint: string }> = {
    IMAGEN: {
      label: 'Usar imagen como firma',
      hint: 'La primera vez se le pide subir un archivo de imagen con su firma (PNG, JPG o WEBP).',
    },
    DIBUJO: {
      label: 'Usar dibujo con mouse como firma',
      hint: 'La primera vez se le pide dibujarla en un lienzo con el mouse o el dedo.',
    },
  };

  constructor(
    private service: GaFirmasService,
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
      next: (res) => {
        this.tipos = res.tipos ?? [];
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

  label(tipo: FirmaTipoDto): string {
    return GaFirmas.TEXTOS[tipo.codigo]?.label ?? tipo.nombre;
  }

  hint(tipo: FirmaTipoDto): string {
    return GaFirmas.TEXTOS[tipo.codigo]?.hint ?? '';
  }

  get activos(): FirmaTipoDto[] {
    return this.tipos.filter((t) => t.activo);
  }

  /**
   * Desmarcar el último dejaría a quien firma un consolidado sin ninguna forma de registrar su
   * firma, así que el último marcado no se puede apagar. El backend corta igual: este bloqueo es
   * para no ofrecer un clic que va a terminar en error.
   */
  bloqueado(tipo: FirmaTipoDto): boolean {
    return this.saving || (tipo.activo && this.activos.length === 1);
  }

  onToggle(tipo: FirmaTipoDto, activo: boolean): void {
    if (this.bloqueado(tipo) || tipo.activo === activo) return;

    // Optimista: el checkbox ya se movió con el clic y revertirlo solo al fallar evita que parpadee.
    const anterior = tipo.activo;
    tipo.activo = activo;
    this.saving = true;
    this.guardado = false;

    const payload = this.tipos.map((t) => ({ codigo: t.codigo, activo: t.activo }));

    this.service.guardar(payload).subscribe({
      next: (res) => {
        this.tipos = res.tipos ?? this.tipos;
        this.saving = false;
        this.guardado = true;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        tipo.activo = anterior;
        this.saving = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
