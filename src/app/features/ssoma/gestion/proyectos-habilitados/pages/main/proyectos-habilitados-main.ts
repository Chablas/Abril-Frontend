import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ProyectoHabilitadoListDTO } from '../../../../shared/dtos/proyecto-habilitado.dtos';
import {
  AbrilPageHeaderComponent,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-proyectos-habilitados-main',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './proyectos-habilitados-main.html',
  styleUrl: './proyectos-habilitados-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosHabilitadosMainComponent implements OnInit {
  private svc = inject(ProyectoHabilitadoService);
  private errorSvc = inject(ErrorService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  proyectos: ProyectoHabilitadoListDTO[] = [];
  cambiandoId: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.svc.getTodos().subscribe({
      next: (res) => {
        this.proyectos = res;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggle(p: ProyectoHabilitadoListDTO): void {
    if (this.cambiandoId === p.proyectoId) return;
    const nuevoValor = !p.habilitado;
    this.cambiandoId = p.proyectoId;
    this.cdr.markForCheck();
    this.svc.setHabilitado(p.proyectoId, nuevoValor).subscribe({
      next: () => {
        p.habilitado = nuevoValor;
        this.cambiandoId = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cambiandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
