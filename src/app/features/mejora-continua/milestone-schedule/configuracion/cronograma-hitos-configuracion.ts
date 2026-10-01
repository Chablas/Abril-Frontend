import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTab, SectionTabs } from '../../../../shared/components/section-tabs/section-tabs';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { CronogramaCorreos } from './components/cronograma-correos/cronograma-correos';
import { CronogramaConfiguracionService } from './services/cronograma-configuracion.service';
import {
  CronogramaConfiguracion,
  CronogramaCorreoGrupo,
} from './dtos/cronograma-configuracion.dto';

/**
 * Cronograma de Hitos → Configuración (botón «Configuración» de la pantalla). Por ahora dos
 * secciones, que salen de la base: Correos (los dispara una acción, como subir una versión) y
 * Recordatorios (los dispara el calendario). Cada correo tiene su subsección, su interruptor y su
 * lista de destinatarios; el aspecto es el de la Configuración de Solicitud de Salidas.
 *
 * Todo llega en una sola petición; después cada control guarda al tocarlo.
 */
@Component({
  standalone: true,
  selector: 'app-cronograma-hitos-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, SectionTabs, CronogramaCorreos],
  templateUrl: './cronograma-hitos-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class CronogramaHitosConfiguracion implements OnInit {
  datos: CronogramaConfiguracion | null = null;
  /** Las secciones como pestañas (se arman una vez, al cargar). */
  secciones: SectionTab[] = [];
  grupoActivo: string | null = null;
  cargando = true;

  constructor(
    private service: CronogramaConfiguracionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.loaderService.show();
    this.service.get().subscribe({
      next: (datos) => {
        // El conteo va en la etiqueta: elegir un rol sin nadie es elegir un destinatario al que hoy
        // no le llega el correo, y eso tiene que verse al elegirlo.
        datos.roles = datos.roles.map((r) => ({
          ...r,
          label: r.miembros === 0
            ? `${r.nombre} — sin nadie asignado`
            : `${r.nombre} — ${r.miembros} ${r.miembros === 1 ? 'persona' : 'personas'}`,
        }));
        this.datos = datos;
        this.secciones = datos.grupos.map((g) => ({ id: g.codigo, label: g.nombre }));
        this.grupoActivo = datos.grupos[0]?.codigo ?? null;
        this.cargando = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get grupo(): CronogramaCorreoGrupo | null {
    return this.datos?.grupos.find((g) => g.codigo === this.grupoActivo) ?? null;
  }

  onSeccionChange(codigo: string): void {
    this.grupoActivo = codigo;
  }

  volver(): void {
    this.router.navigate(['/mejora-continua/milestone-schedule']);
  }
}
