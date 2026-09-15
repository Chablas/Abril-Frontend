import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

/**
 * "Datos Base" ya no es una pantalla propia: la card de Área/HH/Trabajadores + el combobox de
 * proyecto + las sub-tabs (Cronograma, Personal, Vigilancia, Servicios, Ratios, Kits, Cálculo
 * técnico) viven todas juntas en la ficha del proyecto (proyecto-page) — así el usuario no tiene
 * que hacer un click extra para llegar de Datos Base a esas sub-tabs.
 *
 * Esta pantalla solo decide A QUÉ proyecto redirigir: el del trabajador logueado si tiene
 * vinculación activa: si no (p. ej. personal de oficina), muestra un combobox mínimo para elegir
 * uno antes de entrar.
 */
@Component({
  selector: 'app-drivers-page',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './drivers-page.html',
  styleUrl: './drivers-page.css',
})
export class DriversPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc = inject(PresupuestoMaterialesService);
  private router = inject(Router);

  proyectos: ProyectoSimple[] = [];
  cargando = true;
  proyectoElegidoId: number | null = null;

  ngOnInit(): void {
    this.svc.getProyectoActual().subscribe({
      next: ({ projectId }) => this.resolverDestino(projectId),
      error: () => this.resolverDestino(null),
    });
  }

  /** Mi obra vinculada tiene prioridad; si no hay, cae al último proyecto elegido a mano en
   * cualquier pantalla del módulo (personal de oficina/gerencia sin vinculación activa). */
  private resolverDestino(projectId: number | null): void {
    const id = projectId ?? this.svc.getUltimoProyectoId();
    if (id) {
      this.irAFicha(id);
      return;
    }
    this.cargarProyectosParaElegir();
  }

  private cargarProyectosParaElegir(): void {
    this.svc.getDrivers().subscribe({
      next: (drivers) => {
        this.proyectos = drivers
          .map((d) => ({ projectId: d.projectId, projectDescription: d.projectDescription }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  irAFicha(id: number | null): void {
    if (!id) return;
    this.svc.setUltimoProyectoId(id);
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', id], { replaceUrl: true });
  }
}
