import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { InterconsultaService } from '../../../ssoma/salud-ocupacional/services/interconsulta.service';

@Component({
  selector: 'app-clinica-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class ClinicaDashboard implements OnInit {
  hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  progHoy = 0;
  progPendientes = 0;
  progEnAtencion = 0;
  progCompletadas = 0;
  interconsultasPendientes = 0;
  progSemana = 0;
  loading = true;

  constructor(
    private router: Router,
    private progSvc: ClinicaProgramacionService,
    private icSvc: InterconsultaService,
  ) {}

  ngOnInit(): void {
    this.progSvc.getProgramacionesHoy().subscribe({
      next: (items) => {
        this.progHoy = items.length;
        this.progPendientes = items.filter(i => i.estado === 'Programado').length;
        this.progEnAtencion = items.filter(i => ['Aceptado por Clínica','En Atención'].includes(i.estado)).length;
        this.progCompletadas = items.filter(i => i.estado === 'Completado').length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.icSvc.getInterconsultas({ estado: 'Pendiente', pageSize: 1 }).subscribe({
      next: (res: any) => { this.interconsultasPendientes = res.totalCount ?? res.items?.length ?? 0; },
      error: () => {}
    });

    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    this.progSvc.getProgramacionesFiltradas({
      desde: lunes.toISOString().split('T')[0],
      hasta: domingo.toISOString().split('T')[0],
    }).subscribe({
      next: (items) => { this.progSemana = items.length; },
      error: () => {}
    });
  }

  ir(ruta: string) { this.router.navigate(['/clinica/' + ruta]); }
}
