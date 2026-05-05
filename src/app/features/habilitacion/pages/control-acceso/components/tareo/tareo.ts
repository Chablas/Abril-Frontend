import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  ControlAccesoService,
  TareoDto,
  TareoPartidaDto,
} from '../../../../services/control-acceso.service';

@Component({
  selector: 'app-control-acceso-tareo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tareo.html',
  styleUrl: './tareo.css',
})
export class Tareo implements OnChanges {
  @Input() proyectoId!: number;

  fecha = new Date().toISOString().slice(0, 10);
  partidas: TareoPartidaDto[] = [];
  loading = false;
  saving = false;

  constructor(
    private service: ControlAccesoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoId'] && this.proyectoId) {
      this.loadTareo();
    }
  }

  loadTareo(): void {
    this.loading = true;
    this.service.getTareo(this.proyectoId, this.fecha).subscribe({
      next: res => {
        this.partidas = res.partidas ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.partidas = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFechaChange(): void {
    this.loadTareo();
  }

  get partidasCasa(): TareoPartidaDto[] {
    return this.partidas.filter(p => p.tipo === 'CASA');
  }

  get partidasContratistas(): TareoPartidaDto[] {
    return this.partidas.filter(p => p.tipo === 'CONTRATISTA');
  }

  get totalCasa(): { cantidad: number; horas: number } {
    return this.sumar(this.partidasCasa);
  }

  get totalContratistas(): { cantidad: number; horas: number } {
    return this.sumar(this.partidasContratistas);
  }

  get totalGeneral(): { cantidad: number; horas: number } {
    return {
      cantidad: this.totalCasa.cantidad + this.totalContratistas.cantidad,
      horas: this.totalCasa.horas + this.totalContratistas.horas,
    };
  }

  private sumar(lista: TareoPartidaDto[]): { cantidad: number; horas: number } {
    return {
      cantidad: lista.reduce((s, p) => s + (Number(p.cantidad) || 0), 0),
      horas: lista.reduce((s, p) => s + (Number(p.horas) || 0), 0),
    };
  }

  agregarPartida(tipo: 'CASA' | 'CONTRATISTA'): void {
    this.partidas = [...this.partidas, { nombre: '', tipo, cantidad: 0, horas: 0 }];
  }

  eliminarPartida(partida: TareoPartidaDto): void {
    this.partidas = this.partidas.filter(p => p !== partida);
  }

  guardar(): void {
    const invalidas = this.partidas.filter(p => !p.nombre.trim());
    if (invalidas.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Todas las partidas deben tener un nombre.',
      });
      return;
    }

    this.saving = true;
    const body: TareoDto = {
      proyectoId: this.proyectoId,
      fecha: this.fecha,
      partidas: this.partidas,
    };
    this.service.saveTareo(body).subscribe({
      next: res => {
        this.partidas = res.partidas ?? this.partidas;
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: err => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo guardar el tareo.',
        });
        this.cdr.detectChanges();
      },
    });
  }
}
