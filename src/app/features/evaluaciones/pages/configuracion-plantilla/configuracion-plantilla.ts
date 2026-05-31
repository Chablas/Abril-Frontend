import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EvPlantillaService } from '../../services/ev-plantilla.service';
import { EvPlantillaDto } from '../../dtos/ev-plantilla.model';

@Component({
  selector: 'app-configuracion-plantilla',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './configuracion-plantilla.html',
  styleUrl: './configuracion-plantilla.css',
})
export class ConfiguracionPlantilla implements OnInit {
  areas: string[] = [];
  areaActiva = '';
  criterios: EvPlantillaDto[] = [];
  editandoId: number | null = null;
  editTexto = '';

  constructor(
    private plantillaService: EvPlantillaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.plantillaService.getAreas().subscribe({
      next: (a) => {
        this.areas = a;
        if (a.length) this.selectArea(a[0]);
        this.cdr.detectChanges();
      },
    });
  }

  selectArea(area: string): void {
    this.areaActiva = area;
    this.plantillaService.getByArea(area).subscribe({
      next: (c) => {
        this.criterios = c;
        this.editandoId = null;
        this.cdr.detectChanges();
      },
    });
  }

  iniciarEdicion(c: EvPlantillaDto): void {
    this.editandoId = c.id;
    this.editTexto = c.criterio;
  }

  guardarEdicion(c: EvPlantillaDto): void {
    this.plantillaService
      .actualizar(c.id, { criterio: this.editTexto, activo: c.activo })
      .subscribe({
        next: () => {
          c.criterio = this.editTexto;
          this.editandoId = null;
          this.cdr.detectChanges();
        },
      });
  }

  toggleActivo(c: EvPlantillaDto): void {
    this.plantillaService
      .actualizar(c.id, { criterio: c.criterio, activo: !c.activo })
      .subscribe({
        next: () => {
          c.activo = !c.activo;
          this.cdr.detectChanges();
        },
      });
  }
}
