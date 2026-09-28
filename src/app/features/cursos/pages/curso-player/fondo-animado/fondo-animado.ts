import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideEstilo } from '../../../dtos/curso.dtos';

interface Burbuja {
  top: number;
  left: number;
  size: number;
  delay: number;
  duracion: number;
  colorInterno: string;
  colorExterno: string;
}

// Paleta de marca por defecto (ancla: --color-abril-standard). Rota de forma determinística
// según el índice de la slide para que un curso sin "estilo" configurado igual tenga variedad.
// Paleta "seguridad industrial": carbón + ámbar/rojo de advertencia, coherente con el hero de
// /cursos y el editor. Rota de forma determinística según el índice de la slide.
const PALETA_DEFECTO: { claro: string; oscuro: string }[] = [
  {
    claro: 'linear-gradient(125deg, #f5a623 0%, #7a4a12 55%, #14100b 120%)',
    oscuro: 'linear-gradient(125deg, #3a2205 0%, #1a1006 55%, #0b0d10 120%)',
  },
  {
    claro: 'linear-gradient(125deg, #ff7847 0%, #7a2e12 55%, #14100b 120%)',
    oscuro: 'linear-gradient(125deg, #3a1505 0%, #1a0a06 55%, #0b0d10 120%)',
  },
  {
    claro: 'linear-gradient(125deg, #ffd23f 0%, #8a5a0a 55%, #14100b 120%)',
    oscuro: 'linear-gradient(125deg, #3a2a02 0%, #1a1305 55%, #0b0d10 120%)',
  },
  {
    claro: 'linear-gradient(125deg, #f5a623 0%, #1f2a33 60%, #0b0d10 120%)',
    oscuro: 'linear-gradient(125deg, #3a2205 0%, #0f1a20 60%, #0b0d10 120%)',
  },
];

// RNG determinístico (mulberry32): mismo seed = misma secuencia siempre, para que las burbujas
// no "salten" en cada render y sean reproducibles por slide.
function crearRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Component({
  selector: 'app-fondo-animado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fondo-animado.html',
  styleUrl: './fondo-animado.css',
})
export class FondoAnimado {
  private _slideIndex = 0;
  private _estilo: SlideEstilo | undefined;

  fondoClaro = '';
  fondoOscuro = '';
  burbujas: Burbuja[] = [];

  @Input() set estilo(value: SlideEstilo | undefined) {
    this._estilo = value;
    this.recalcular();
  }
  get estilo(): SlideEstilo | undefined {
    return this._estilo;
  }

  @Input() set slideIndex(value: number) {
    this._slideIndex = value ?? 0;
    this.recalcular();
  }
  get slideIndex(): number {
    return this._slideIndex;
  }

  private recalcular(): void {
    const defecto = PALETA_DEFECTO[this._slideIndex % PALETA_DEFECTO.length];
    this.fondoClaro = this._estilo?.fondoClaro || defecto.claro;
    this.fondoOscuro = this._estilo?.fondoOscuro || defecto.oscuro;

    const mostrarBurbujas = this._estilo?.burbujas !== false;
    this.burbujas = mostrarBurbujas ? this.generarBurbujas(this._slideIndex) : [];
  }

  private generarBurbujas(seed: number): Burbuja[] {
    const rng = crearRng(seed * 97 + 13);
    const cantidad = 5;
    const burbujas: Burbuja[] = [];
    for (let i = 0; i < cantidad; i++) {
      const size = Math.round(180 + rng() * 260); // blobs grandes y difuminados, no burbujitas
      burbujas.push({
        // Rango 0-100% en ambos ejes para que se distribuyan por toda la pantalla, no solo
        // en la mitad superior/izquierda.
        top: Math.round(rng() * 100),
        left: Math.round(rng() * 100),
        size,
        delay: +(rng() * 3).toFixed(2),
        duracion: +(3.5 + rng() * 2).toFixed(2),
        colorInterno: rng() > 0.5 ? 'rgba(245, 166, 35, 0.4)' : 'rgba(255, 255, 255, 0.18)',
        colorExterno: 'rgba(255, 255, 255, 0)',
      });
    }
    return burbujas;
  }
}
