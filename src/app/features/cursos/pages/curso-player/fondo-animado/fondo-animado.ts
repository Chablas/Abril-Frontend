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
const PALETA_DEFECTO: { claro: string; oscuro: string }[] = [
  {
    claro: 'linear-gradient(135deg, #eaf7f2 0%, #bfe8d6 45%, #1f9d63 100%)',
    oscuro: 'linear-gradient(135deg, #001a10 0%, #0a3d2a 50%, #0f6e56 100%)',
  },
  {
    claro: 'linear-gradient(135deg, #eaf4fa 0%, #cbe7f5 40%, #208fcf 80%, #005d9d 100%)',
    oscuro: 'linear-gradient(135deg, #000e1a 0%, #00345c 50%, #005d9d 100%)',
  },
  {
    claro: 'linear-gradient(135deg, #f3f7ec 0%, #d8ecc4 45%, #6fae2f 100%)',
    oscuro: 'linear-gradient(135deg, #0a1204 0%, #1f3a0d 50%, #3f6b1a 100%)',
  },
  {
    claro: 'linear-gradient(135deg, #eef4f2 0%, #cfe6de 40%, #14806b 80%, #0f6e56 100%)',
    oscuro: 'linear-gradient(135deg, #00120d 0%, #06342a 50%, #0f6e56 100%)',
  },
  {
    claro: 'linear-gradient(135deg, #eafaf6 0%, #a9e6d2 35%, #1fb0a3 65%, #005d9d 100%)',
    oscuro: 'linear-gradient(135deg, #001410 0%, #0a3d38 40%, #0f6e56 70%, #00345c 100%)',
  },
  {
    claro: 'linear-gradient(135deg, #f4f9ea 0%, #cbe8a8 30%, #4fae5a 65%, #0f6e56 100%)',
    oscuro: 'linear-gradient(135deg, #0c1406 0%, #1f3a12 40%, #1f9d63 70%, #0f6e56 100%)',
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
    const cantidad = 10;
    const burbujas: Burbuja[] = [];
    for (let i = 0; i < cantidad; i++) {
      const size = Math.round(28 + rng() * 170); // 28px - 198px, más variedad de tamaños
      burbujas.push({
        // Rango 0-100% en ambos ejes para que se distribuyan por toda la pantalla, no solo
        // en la mitad superior/izquierda.
        top: Math.round(rng() * 100),
        left: Math.round(rng() * 100),
        size,
        delay: +(rng() * 3).toFixed(2),
        duracion: +(3.5 + rng() * 2).toFixed(2),
        colorInterno: 'rgba(255, 255, 255, 0.55)',
        colorExterno: 'rgba(255, 255, 255, 0.05)',
      });
    }
    return burbujas;
  }
}
