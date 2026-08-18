import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ACTAS_REUNION_TABS } from '../actas-reunion-tabs';
import { MisAcuerdoDTO } from '../dtos/actas-reunion.dto';

const HOY = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-actas-reunion-dashboard',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './actas-reunion-dashboard.html',
})
export class ActasReunionDashboard implements OnInit {
  readonly tabs = ACTAS_REUNION_TABS;

  acuerdos: MisAcuerdoDTO[] = [];

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getMisAcuerdos().subscribe({
      next: (data) => {
        this.acuerdos = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private get pendientes(): MisAcuerdoDTO[] {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado !== 'CUMPLIDO' && a.reunionAcuerdoEstado !== 'ANULADO');
  }

  esVencido(a: MisAcuerdoDTO): boolean {
    return !!a.fechaProgramada && a.fechaProgramada < HOY()
      && a.reunionAcuerdoEstado !== 'CUMPLIDO' && a.reunionAcuerdoEstado !== 'ANULADO';
  }

  get totalPendientes(): number {
    return this.pendientes.length;
  }

  get totalCriticos(): number {
    return this.pendientes.filter((a) => a.criticidad === 'CRITICO').length;
  }

  get totalVencidos(): number {
    return this.pendientes.filter((a) => this.esVencido(a)).length;
  }

  get totalCumplidosRecientes(): number {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado === 'CUMPLIDO').length;
  }

  get vencidos(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => this.esVencido(a));
  }

  get criticos(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => !this.esVencido(a) && a.criticidad === 'CRITICO');
  }

  get otrosPendientes(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => !this.esVencido(a) && a.criticidad !== 'CRITICO');
  }

  get cumplidosRecientes(): MisAcuerdoDTO[] {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado === 'CUMPLIDO');
  }

  criticidadClass(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIO':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-500 border border-gray-200';
    }
  }

  criticidadLabel(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'Crítico';
      case 'MEDIO':
        return 'Medio';
      default:
        return 'Normal';
    }
  }

  irAReunion(a: MisAcuerdoDTO): void {
    this.router.navigate(['/projects/actas-reunion', a.reunionId]);
  }
}
